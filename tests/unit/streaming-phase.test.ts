import { describe, expect, it } from "vitest";

import {
  makeStreamingPhaseHeaderLines,
  updateStreamingPhaseHeader,
} from "@/components/editor/streaming-phase";

describe("streaming phase helpers", () => {
  it("builds a stable two-line header for seeded streaming output", () => {
    expect(makeStreamingPhaseHeaderLines("Collecting sources…")).toEqual([
      { lineNum: 1, type: "meta", text: "Collecting sources…", small: true },
      { lineNum: 0, type: "blank" },
    ]);
  });

  it("updates the existing meta row instead of targeting a non-existent line", () => {
    const lines = makeStreamingPhaseHeaderLines("Collecting sources…");

    expect(updateStreamingPhaseHeader(lines, "Processing content…")).toEqual([
      { lineNum: 1, type: "meta", text: "Processing content…", small: true },
      { lineNum: 0, type: "blank" },
    ]);
  });

  it("returns null or empty inputs unchanged", () => {
    expect(updateStreamingPhaseHeader(null, "Drafting brief…")).toBeNull();
    expect(updateStreamingPhaseHeader([], "Drafting brief…")).toEqual([]);
  });
});
