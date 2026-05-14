import { deflateSync } from "node:zlib";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sourceAsset: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/services/google-genai", () => ({
  transcribeAudioToEnglish: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { transcribeAudioToEnglish } from "@/server/services/google-genai";
import {
  processAudioAsset,
  processPdfAsset,
  processSessionFileSources,
} from "@/server/services/source-processing";

const mockPrisma = prisma as unknown as {
  sourceAsset: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockTranscribeAudioToEnglish =
  transcribeAudioToEnglish as unknown as ReturnType<typeof vi.fn>;

function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

function makePdfWithTextStream(text: string) {
  const stream = deflateSync(Buffer.from(`BT (${text}) Tj ET`, "latin1"));
  return Buffer.concat([
    Buffer.from("%PDF-1.7\n1 0 obj\n", "latin1"),
    Buffer.from(
      `<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`,
      "latin1",
    ),
    stream,
    Buffer.from("\nendstream\nendobj\n%%EOF", "latin1"),
  ]);
}

function createTx() {
  return {
    sourceChunk: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe("source processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    mockPrisma.sourceAsset.update.mockResolvedValue({ id: "asset_1" });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback(createTx()),
    );
  });

  it("processes a PDF into text and chunks", async () => {
    const pdf = makePdfWithTextStream("Client needs a secure portal.");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-length": String(pdf.length) }),
        arrayBuffer: async () => toArrayBuffer(pdf),
      }),
    );
    mockPrisma.sourceAsset.findFirst.mockResolvedValueOnce({
      id: "asset_1",
      sessionId: "session_1",
      sourceType: "PDF",
      status: "UPLOADED",
      textContent: null,
      chunks: [],
      appUrl: "https://utfs.io/f/pdf",
      ufsUrl: "https://utfs.io/f/pdf",
      mimeType: "application/pdf",
      providerMetadata: null,
    });

    const result = await processPdfAsset({
      assetId: "asset_1",
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    expect(result.status).toBe("processed");
    expect(mockPrisma.sourceAsset.update).toHaveBeenLastCalledWith({
      where: { id: "asset_1" },
      data: expect.objectContaining({
        status: "PROCESSED",
        textContent: expect.stringContaining("secure portal"),
      }),
    });
  });

  it("accepts UploadThing ufs.sh app subdomains when processing PDFs", async () => {
    const pdf = makePdfWithTextStream("Client needs a vendor dashboard.");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-length": String(pdf.length) }),
        arrayBuffer: async () => toArrayBuffer(pdf),
      }),
    );
    mockPrisma.sourceAsset.findFirst.mockResolvedValueOnce({
      id: "asset_ufs",
      sessionId: "session_1",
      sourceType: "PDF",
      status: "UPLOADED",
      textContent: null,
      chunks: [],
      appUrl: "https://dsl3bex521.ufs.sh/f/pdf",
      ufsUrl: "https://dsl3bex521.ufs.sh/f/pdf",
      mimeType: "application/pdf",
      providerMetadata: null,
    });

    const result = await processPdfAsset({
      assetId: "asset_ufs",
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    expect(result.status).toBe("processed");
    expect(fetch).toHaveBeenCalledWith(
      "https://dsl3bex521.ufs.sh/f/pdf",
      expect.any(Object),
    );
  });

  it("rejects asset URL hosts that only look like ufs.sh", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockPrisma.sourceAsset.findFirst.mockResolvedValueOnce({
      id: "asset_bad_host",
      sessionId: "session_1",
      sourceType: "PDF",
      status: "UPLOADED",
      textContent: null,
      chunks: [],
      appUrl: "https://ufs.sh.evil.example/f/pdf",
      ufsUrl: "https://ufs.sh.evil.example/f/pdf",
      mimeType: "application/pdf",
      providerMetadata: null,
    });

    const result = await processPdfAsset({
      assetId: "asset_bad_host",
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    expect(result).toMatchObject({
      status: "failed",
      errorMessage: "Untrusted asset URL host: ufs.sh.evil.example",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("transcribes audio to English text and chunks", async () => {
    const audio = Buffer.from("fake-audio");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-length": String(audio.length) }),
        arrayBuffer: async () => toArrayBuffer(audio),
      }),
    );
    mockPrisma.sourceAsset.findFirst.mockResolvedValueOnce({
      id: "asset_2",
      sessionId: "session_1",
      sourceType: "AUDIO",
      status: "UPLOADED",
      textContent: null,
      chunks: [],
      appUrl: "https://utfs.io/f/audio",
      ufsUrl: "https://utfs.io/f/audio",
      mimeType: "audio/webm",
      providerMetadata: null,
    });
    mockTranscribeAudioToEnglish.mockResolvedValueOnce({
      detectedLanguage: "Spanish",
      originalTranscript: "Necesitamos pagos.",
      englishTranscript: "We need payments.",
    });

    const result = await processAudioAsset({
      assetId: "asset_2",
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    expect(result.status).toBe("processed");
    expect(mockTranscribeAudioToEnglish).toHaveBeenCalledWith({
      audioBase64: audio.toString("base64"),
      mimeType: "audio/webm",
    });
    expect(mockPrisma.sourceAsset.update).toHaveBeenLastCalledWith({
      where: { id: "asset_2" },
      data: expect.objectContaining({
        status: "PROCESSED",
        textContent: "We need payments.",
      }),
    });
  });

  it("processes PDF and audio sources concurrently while preserving result order", async () => {
    const pdf = makePdfWithTextStream("Client needs a secure portal.");
    const audio = Buffer.from("fake-audio");
    let releasePdfFetch: (() => void) | undefined;
    let audioFetchStarted = false;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/pdf")) {
          return new Promise((resolve) => {
            releasePdfFetch = () =>
              resolve({
                ok: true,
                status: 200,
                headers: new Headers({
                  "content-length": String(pdf.length),
                }),
                arrayBuffer: async () => toArrayBuffer(pdf),
              });
          });
        }

        audioFetchStarted = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-length": String(audio.length) }),
          arrayBuffer: async () => toArrayBuffer(audio),
        });
      }),
    );

    mockPrisma.sourceAsset.findMany.mockResolvedValueOnce([
      { id: "asset_pdf", sessionId: "session_1", sourceType: "PDF" },
      { id: "asset_audio", sessionId: "session_1", sourceType: "AUDIO" },
    ]);

    mockPrisma.sourceAsset.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "asset_pdf") {
        return {
          id: "asset_pdf",
          sessionId: "session_1",
          sourceType: "PDF",
          status: "UPLOADED",
          textContent: null,
          chunks: [],
          appUrl: "https://utfs.io/f/pdf",
          ufsUrl: "https://utfs.io/f/pdf",
          mimeType: "application/pdf",
          providerMetadata: null,
        };
      }

      return {
        id: "asset_audio",
        sessionId: "session_1",
        sourceType: "AUDIO",
        status: "UPLOADED",
        textContent: null,
        chunks: [],
        appUrl: "https://utfs.io/f/audio",
        ufsUrl: "https://utfs.io/f/audio",
        mimeType: "audio/webm",
        providerMetadata: null,
      };
    });

    mockTranscribeAudioToEnglish.mockResolvedValueOnce({
      detectedLanguage: "Spanish",
      originalTranscript: "Necesitamos pagos.",
      englishTranscript: "We need payments.",
    });

    const runPromise = processSessionFileSources({
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    await vi.waitFor(() => {
      expect(audioFetchStarted).toBe(true);
      expect(releasePdfFetch).toBeTypeOf("function");
    });

    const releasePdf = releasePdfFetch;
    if (typeof releasePdf !== "function") {
      throw new Error("Expected PDF fetch resolver to be ready.");
    }
    releasePdf();
    const result = await runPromise;

    expect(result.map((item) => item.assetId)).toEqual([
      "asset_pdf",
      "asset_audio",
    ]);
    expect(result.map((item) => item.status)).toEqual([
      "processed",
      "processed",
    ]);
  });

  it("aggregates mixed processed, skipped, and failed results", async () => {
    const pdf = makePdfWithTextStream("Client needs a secure portal.");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/pdf-success")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ "content-length": String(pdf.length) }),
            arrayBuffer: async () => toArrayBuffer(pdf),
          });
        }

        return Promise.resolve({
          ok: false,
          status: 500,
          headers: new Headers(),
          arrayBuffer: async () => toArrayBuffer(Buffer.alloc(0)),
        });
      }),
    );

    mockPrisma.sourceAsset.findMany.mockResolvedValueOnce([
      { id: "asset_processed", sessionId: "session_1", sourceType: "PDF" },
      { id: "asset_skipped", sessionId: "session_1", sourceType: "AUDIO" },
      { id: "asset_failed", sessionId: "session_1", sourceType: "PDF" },
    ]);

    mockPrisma.sourceAsset.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "asset_processed") {
        return {
          id: "asset_processed",
          sessionId: "session_1",
          sourceType: "PDF",
          status: "UPLOADED",
          textContent: null,
          chunks: [],
          appUrl: "https://utfs.io/f/pdf-success",
          ufsUrl: "https://utfs.io/f/pdf-success",
          mimeType: "application/pdf",
          providerMetadata: null,
        };
      }

      if (where.id === "asset_skipped") {
        return {
          id: "asset_skipped",
          sessionId: "session_1",
          sourceType: "AUDIO",
          status: "PROCESSED",
          textContent: "Already transcribed.",
          chunks: [{ id: "chunk_1" }],
          appUrl: "https://utfs.io/f/audio",
          ufsUrl: "https://utfs.io/f/audio",
          mimeType: "audio/webm",
          providerMetadata: null,
        };
      }

      return {
        id: "asset_failed",
        sessionId: "session_1",
        sourceType: "PDF",
        status: "UPLOADED",
        textContent: null,
        chunks: [],
        appUrl: "https://utfs.io/f/pdf-failure",
        ufsUrl: "https://utfs.io/f/pdf-failure",
        mimeType: "application/pdf",
        providerMetadata: null,
      };
    });

    const result = await processSessionFileSources({
      sessionId: "session_1",
      requestedBy: "user_1",
    });

    expect(result.map((item) => item.status)).toEqual([
      "processed",
      "skipped",
      "failed",
    ]);
    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "source-processing",
        message: "Completed session file source processing.",
        sessionId: "session_1",
        processed: 1,
        skipped: 1,
        failed: 1,
      }),
    );
  });
});
