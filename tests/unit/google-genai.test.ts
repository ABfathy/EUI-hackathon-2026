import { FinishReason, type GenerateContentResponse } from "@google/genai";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseStructuredResponse } from "@/server/services/google-genai";

const TestSchema = z.object({
  ok: z.boolean(),
});

function createResponse(input: {
  text?: string;
  finishReason?: FinishReason;
  finishMessage?: string;
}) {
  return {
    text: input.text,
    candidates: [
      {
        finishReason: input.finishReason,
        finishMessage: input.finishMessage,
      },
    ],
    usageMetadata: {
      totalTokenCount: 42,
      candidatesTokenCount: 7,
    },
  } as GenerateContentResponse;
}

describe("parseStructuredResponse", () => {
  it("parses valid structured JSON when the candidate stops normally", () => {
    const result = parseStructuredResponse(
      createResponse({
        text: '{"ok":true}',
        finishReason: FinishReason.STOP,
      }),
      TestSchema,
    );

    expect(result.parsed).toEqual({ ok: true });
    expect(result.metadata.finishReason).toBe(FinishReason.STOP);
  });

  it("throws INVALID_MODEL_OUTPUT-compatible syntax errors for max-token truncation", () => {
    expect(() =>
      parseStructuredResponse(
        createResponse({
          text: '{"ok":',
          finishReason: FinishReason.MAX_TOKENS,
          finishMessage: "Output token limit reached.",
        }),
        TestSchema,
      ),
    ).toThrow(/finish reason MAX_TOKENS/i);
  });

  it("throws when structured output text is empty", () => {
    expect(() =>
      parseStructuredResponse(
        createResponse({
          text: "",
          finishReason: FinishReason.STOP,
        }),
        TestSchema,
      ),
    ).toThrow(/empty response/i);
  });
});
