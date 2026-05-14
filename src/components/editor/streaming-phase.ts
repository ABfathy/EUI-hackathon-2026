import type { DocLineData } from "@/components/editor/doc-view";

export function makeStreamingPhaseHeaderLines(
  phaseLabel: string,
): DocLineData[] {
  return [
    { lineNum: 1, type: "meta", text: phaseLabel, small: true },
    { lineNum: 0, type: "blank" },
  ];
}

export function updateStreamingPhaseHeader(
  lines: DocLineData[] | null,
  phaseLabel: string,
): DocLineData[] | null {
  if (!lines || lines.length < 1) return lines;

  const updated = [...lines];
  updated[0] = {
    lineNum: 1,
    type: "meta",
    text: phaseLabel,
    small: true,
  };
  return updated;
}
