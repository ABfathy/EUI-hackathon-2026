import { FinishReason, type GenerateContentResponse } from "@google/genai";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  normalizeBriefOutput,
  parseStructuredResponse,
} from "@/server/services/google-genai";

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

describe("normalizeBriefOutput", () => {
  it("trims oversized generated-brief sections to schema limits", () => {
    const claim = (i: number) => ({
      text: `Claim ${i}`,
      confidence: "HIGH" as const,
      evidence: [],
    });
    const question = (i: number) => ({
      text: `Question ${i}`,
      reason: `Reason ${i}`,
      evidence: [],
    });

    const result = normalizeBriefOutput({
      summary: Array.from({ length: 13 }, (_, i) => claim(i)),
      goals: Array.from({ length: 13 }, (_, i) => claim(i)),
      ambiguities: Array.from({ length: 5 }, (_, i) => question(i)),
      followUpQuestions: Array.from({ length: 5 }, (_, i) => question(i)),
    });

    expect(result.summary).toHaveLength(12);
    expect(result.goals).toHaveLength(12);
    expect(result.ambiguities).toHaveLength(4);
    expect(result.followUpQuestions).toHaveLength(4);
  });
});
