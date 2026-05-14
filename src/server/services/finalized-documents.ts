import { prisma } from "@/lib/prisma";
import {
  extractJson,
  type FinalizedBriefVersion,
  generateFinalizedDocumentFromBriefs,
  generateFinalizedDocumentRevision,
  generateFinalizedDocumentStreamFromBriefs,
} from "@/server/services/google-genai";
import {
  type BriefClaimOutput,
  type FinalizedDocumentOutput,
  FinalizedDocumentOutputSchema,
} from "@/server/validators/brief-output";

import type {
  BriefClaimSection,
  Prisma,
} from "../../../generated/prisma/client";

const FINALIZED_PERSIST_TRANSACTION_TIMEOUT_MS = 20_000;
const FINALIZED_PERSIST_TRANSACTION_MAX_WAIT_MS = 10_000;

export class FinalizedDocumentGenerationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "FINALIZED_DOCUMENT_FAILED",
  ) {
    super(message);
    this.name = "FinalizedDocumentGenerationError";
  }
}

const FINALIZED_SECTION_MAP = {
  projectOverview: "PROJECT_OVERVIEW",
  projectGoals: "PROJECT_GOALS",
  mainFeatures: "MAIN_FEATURES",
  functionalRequirements: "FUNCTIONAL_REQUIREMENTS",
  nonFunctionalRequirements: "NON_FUNCTIONAL_REQUIREMENTS",
  userFlows: "USER_FLOWS",
} satisfies Record<keyof FinalizedDocumentOutput, BriefClaimSection>;

const FINALIZED_SECTION_LIMITS = {
  projectOverview: 12,
  projectGoals: 12,
  mainFeatures: 16,
  functionalRequirements: 24,
  nonFunctionalRequirements: 16,
  userFlows: 16,
} satisfies Record<keyof FinalizedDocumentOutput, number>;

function finalizedErrorFromUnknown(error: unknown) {
  if (error instanceof FinalizedDocumentGenerationError) return error;
  if (error instanceof Error) {
    return new FinalizedDocumentGenerationError(
      error.message,
      500,
      "FINALIZED_MODEL_FAILED",
    );
  }
  return new FinalizedDocumentGenerationError(
    "Finalized document generation failed.",
    500,
    "FINALIZED_DOCUMENT_FAILED",
  );
}

function briefVersionForPrompt(brief: {
  version: number;
  claims: Array<{ section: string; text: string; confidence: string }>;
  questions: Array<{
    section: string;
    text: string;
    reason: string;
    status: string;
  }>;
}): FinalizedBriefVersion {
  return {
    version: brief.version,
    claims: brief.claims,
    questions: brief.questions,
  };
}

function normalizeFinalizedOutput(
  raw: unknown,
): FinalizedDocumentOutput {
  const object =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;

  if (!object) {
    return FinalizedDocumentOutputSchema.parse(raw);
  }

  const trimmed = Object.fromEntries(
    (
      Object.keys(FINALIZED_SECTION_LIMITS) as Array<
        keyof typeof FINALIZED_SECTION_LIMITS
      >
    ).map((key) => {
      const value = object[key];
      return [key, Array.isArray(value) ? value.slice(0, FINALIZED_SECTION_LIMITS[key]) : value];
    }),
  );

  return FinalizedDocumentOutputSchema.parse(trimmed);
}

async function generateWithRetry(briefVersions: FinalizedBriefVersion[]) {
  try {
    return normalizeFinalizedOutput(
      await generateFinalizedDocumentFromBriefs(briefVersions),
    );
  } catch (error) {
    const firstError = finalizedErrorFromUnknown(error);
    try {
      return normalizeFinalizedOutput(
        await generateFinalizedDocumentFromBriefs(
          briefVersions,
          firstError.message,
        ),
      );
    } catch (retryError) {
      throw finalizedErrorFromUnknown(retryError);
    }
  }
}

async function generateRevisionWithRetry(
  currentDocumentSummary: string,
  userMessage: string,
) {
  try {
    return normalizeFinalizedOutput(
      await generateFinalizedDocumentRevision(
        currentDocumentSummary,
        userMessage,
      ),
    );
  } catch (error) {
    const firstError = finalizedErrorFromUnknown(error);
    try {
      return normalizeFinalizedOutput(
        await generateFinalizedDocumentRevision(
          currentDocumentSummary,
          userMessage,
          firstError.message,
        ),
      );
    } catch (retryError) {
      throw finalizedErrorFromUnknown(retryError);
    }
  }
}

async function loadFinalizedDocumentInputs(sessionId: string) {
  const session = await prisma.intakeSession.findUnique({
    where: { id: sessionId },
    select: { id: true, projectId: true },
  });

  if (!session) {
    throw new FinalizedDocumentGenerationError(
      "Intake session was not found.",
      404,
      "SESSION_NOT_FOUND",
    );
  }

  const sourceBriefs = await prisma.briefSnapshot.findMany({
    where: {
      sessionId,
      documentType: "GENERATED_BRIEF",
    },
    orderBy: { version: "desc" },
    take: 3,
    select: {
      id: true,
      version: true,
      claims: {
        orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
        select: { section: true, text: true, confidence: true },
      },
      questions: {
        orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
        select: { section: true, text: true, reason: true, status: true },
      },
    },
  });

  if (sourceBriefs.length === 0) {
    throw new FinalizedDocumentGenerationError(
      "Create at least one generated brief before creating a finalized document.",
      409,
      "NO_GENERATED_BRIEFS",
    );
  }

  const briefVersions = sourceBriefs
    .slice()
    .reverse()
    .map(briefVersionForPrompt);

  return { session, sourceBriefs, briefVersions };
}

async function persistFinalizedDocument({
  sessionId,
  requestedBy,
  projectId,
  sourceBundleVersion,
  output,
  revisionEvent,
  copyDiagramsFromSnapshotId,
}: {
  sessionId: string;
  requestedBy: string;
  projectId: string;
  sourceBundleVersion: number;
  output: FinalizedDocumentOutput;
  revisionEvent: {
    type: "GENERATED" | "REGENERATED";
    summary: string;
    metadata: Prisma.InputJsonValue;
  };
  copyDiagramsFromSnapshotId?: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      const latest = await tx.briefSnapshot.aggregate({
        where: { sessionId, documentType: "FINALIZED_DOCUMENT" },
        _max: { version: true },
      });
      const version = (latest._max.version ?? 0) + 1;

      const snapshot = await tx.briefSnapshot.create({
        data: {
          projectId,
          sessionId,
          version,
          documentType: "FINALIZED_DOCUMENT",
          status: "DRAFT",
          sourceBundleVersion,
          createdBy: requestedBy,
        },
      });

      const claimRows = (
        Object.entries(FINALIZED_SECTION_MAP) as Array<
          [keyof FinalizedDocumentOutput, BriefClaimSection]
        >
      ).flatMap(([key, section]) =>
        output[key].map((item: BriefClaimOutput, orderIndex) => ({
          snapshotId: snapshot.id,
          section,
          orderIndex,
          text: item.text,
          confidence: item.confidence,
        })),
      );

      if (claimRows.length > 0) {
        await tx.briefClaim.createMany({ data: claimRows });
      }

      if (copyDiagramsFromSnapshotId) {
        const priorDiagrams = await tx.briefDiagram.findMany({
          where: { snapshotId: copyDiagramsFromSnapshotId },
          select: {
            diagramType: true,
            title: true,
            mermaidCode: true,
            description: true,
          },
        });

        if (priorDiagrams.length > 0) {
          await tx.briefDiagram.createMany({
            data: priorDiagrams.map((diagram) => ({
              snapshotId: snapshot.id,
              sessionId,
              diagramType: diagram.diagramType,
              title: diagram.title,
              mermaidCode: diagram.mermaidCode,
              description: diagram.description,
            })),
          });
        }
      }

      await tx.revisionEvent.create({
        data: {
          projectId,
          sessionId,
          snapshotId: snapshot.id,
          type: revisionEvent.type,
          actorType: "INTERNAL_USER",
          actorId: requestedBy,
          summary: revisionEvent.summary.replace("{version}", String(version)),
          metadata: revisionEvent.metadata,
        },
      });

      await tx.intakeSession.update({
        where: { id: sessionId },
        data: {
          status: "REVIEW_READY",
          lastActivityAt: new Date(),
        },
      });

      return {
        snapshotId: snapshot.id,
        version: snapshot.version,
        documentType: snapshot.documentType,
      };
    },
    {
      maxWait: FINALIZED_PERSIST_TRANSACTION_MAX_WAIT_MS,
      timeout: FINALIZED_PERSIST_TRANSACTION_TIMEOUT_MS,
    },
  );
}

export async function createFinalizedDocument({
  sessionId,
  requestedBy,
}: {
  sessionId: string;
  requestedBy: string;
}) {
  const { session, sourceBriefs, briefVersions } =
    await loadFinalizedDocumentInputs(sessionId);
  const output = await generateWithRetry(briefVersions);

  return persistFinalizedDocument({
    sessionId,
    requestedBy,
    projectId: session.projectId,
    sourceBundleVersion: sourceBriefs[0]?.version ?? 1,
    output,
    revisionEvent: {
      type: "GENERATED",
      summary: "Generated finalized document v{version}.",
      metadata: {
        documentType: "FINALIZED_DOCUMENT",
        sourceBriefSnapshotIds: sourceBriefs.map((brief) => brief.id),
        sourceBriefVersions: sourceBriefs.map((brief) => brief.version),
      } as Prisma.InputJsonValue,
    },
  });
}

function serializeFinalizedDocument(snapshot: {
  claims: Array<{ section: string; text: string; confidence: string }>;
}): string {
  const lines: string[] = [];
  const claimsBySection = new Map<string, typeof snapshot.claims>();

  for (const claim of snapshot.claims) {
    const bucket = claimsBySection.get(claim.section) ?? [];
    bucket.push(claim);
    claimsBySection.set(claim.section, bucket);
  }

  for (const [section, claims] of claimsBySection) {
    lines.push(`${section}:`);
    for (const claim of claims) {
      lines.push(`- [${claim.confidence}] ${claim.text}`);
    }
  }

  return lines.join("\n");
}

export async function reviseFinalizedDocumentFromFeedback({
  sessionId,
  snapshotId,
  userMessage,
  requestedBy,
}: {
  sessionId: string;
  snapshotId: string;
  userMessage: string;
  requestedBy: string;
}) {
  const session = await prisma.intakeSession.findUnique({
    where: { id: sessionId },
    select: { id: true, projectId: true },
  });

  if (!session) {
    throw new FinalizedDocumentGenerationError(
      "Intake session was not found.",
      404,
      "SESSION_NOT_FOUND",
    );
  }

  const snapshot = await prisma.briefSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      sessionId: true,
      version: true,
      documentType: true,
      sourceBundleVersion: true,
      claims: {
        orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
        select: { section: true, text: true, confidence: true },
      },
    },
  });

  if (!snapshot || snapshot.sessionId !== sessionId) {
    throw new FinalizedDocumentGenerationError(
      "Finalized document was not found.",
      404,
      "SNAPSHOT_NOT_FOUND",
    );
  }

  if (snapshot.documentType !== "FINALIZED_DOCUMENT") {
    throw new FinalizedDocumentGenerationError(
      "Only finalized documents can use finalized feedback revision.",
      409,
      "UNSUPPORTED_DOCUMENT_TYPE",
    );
  }

  const output = await generateRevisionWithRetry(
    serializeFinalizedDocument(snapshot),
    userMessage,
  );

  return persistFinalizedDocument({
    sessionId,
    requestedBy,
    projectId: session.projectId,
    sourceBundleVersion: snapshot.sourceBundleVersion,
    output,
    revisionEvent: {
      type: "REGENERATED",
      summary: "Revised finalized document via feedback into v{version}.",
      metadata: {
        trigger: "feedback-review",
        documentType: "FINALIZED_DOCUMENT",
        sourceSnapshotId: snapshot.id,
        sourceSnapshotVersion: snapshot.version,
        userMessage,
      } as Prisma.InputJsonValue,
    },
    copyDiagramsFromSnapshotId: snapshot.id,
  });
}

export type FinalizedDocumentStreamEvent =
  | { type: "token"; text: string }
  | {
      type: "complete";
      snapshotId: string;
      version: number;
      documentType: "FINALIZED_DOCUMENT";
    }
  | { type: "error"; code: string; message: string };

export async function* createFinalizedDocumentStream({
  sessionId,
  requestedBy,
}: {
  sessionId: string;
  requestedBy: string;
}): AsyncGenerator<FinalizedDocumentStreamEvent> {
  try {
    const { session, sourceBriefs, briefVersions } =
      await loadFinalizedDocumentInputs(sessionId);

    let fullText = "";
    try {
      for await (const chunk of generateFinalizedDocumentStreamFromBriefs(
        briefVersions,
      )) {
        fullText += chunk;
        yield { type: "token", text: chunk };
      }
    } catch (streamError) {
      throw finalizedErrorFromUnknown(streamError);
    }

    let output: FinalizedDocumentOutput;
    try {
      output = normalizeFinalizedOutput(extractJson(fullText));
    } catch (parseError) {
      const hint = finalizedErrorFromUnknown(parseError).message;
      try {
        output = normalizeFinalizedOutput(
          await generateFinalizedDocumentFromBriefs(briefVersions, hint),
        );
      } catch (retryError) {
        throw finalizedErrorFromUnknown(retryError);
      }
    }

    const result = await persistFinalizedDocument({
      sessionId,
      requestedBy,
      projectId: session.projectId,
      sourceBundleVersion: sourceBriefs[0]?.version ?? 1,
      output,
      revisionEvent: {
        type: "GENERATED",
        summary: "Generated finalized document v{version}.",
        metadata: {
          documentType: "FINALIZED_DOCUMENT",
          sourceBriefSnapshotIds: sourceBriefs.map((brief) => brief.id),
          sourceBriefVersions: sourceBriefs.map((brief) => brief.version),
        } as Prisma.InputJsonValue,
      },
    });

    yield {
      type: "complete",
      snapshotId: result.snapshotId,
      version: result.version,
      documentType: "FINALIZED_DOCUMENT",
    };
  } catch (error) {
    const finalError = finalizedErrorFromUnknown(error);
    yield {
      type: "error",
      code: finalError.code,
      message: finalError.message,
    };
  }
}
