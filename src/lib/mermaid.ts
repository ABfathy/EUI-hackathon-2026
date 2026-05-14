const QUOTED_LABEL = /^".*"$/;
const NEEDS_QUOTING = /[()[\]{}:/"',]/;

function quoteLabelIfNeeded(label: string) {
  const trimmed = label.trim();
  if (!trimmed || QUOTED_LABEL.test(trimmed) || !NEEDS_QUOTING.test(trimmed)) {
    return label;
  }

  const escaped = trimmed.replace(/"/g, "&quot;");
  return `"${escaped}"`;
}

function normalizeFlowchartLikeLine(line: string) {
  let normalized = line;

  normalized = normalized.replace(
    /(\b[\w-]+)\(\[([^\]]+)\]\)/g,
    (_match, id: string, label: string) => `${id}([${quoteLabelIfNeeded(label)}])`,
  );

  normalized = normalized.replace(
    /(\b[\w-]+)\[\(([^)]+)\)\]/g,
    (_match, id: string, label: string) => `${id}[(${quoteLabelIfNeeded(label)})]`,
  );

  normalized = normalized.replace(
    /(\b[\w-]+)\{([^}]+)\}/g,
    (_match, id: string, label: string) => `${id}{${quoteLabelIfNeeded(label)}}`,
  );

  normalized = normalized.replace(
    /(\b[\w-]+)\[(?!\()([^\]]+)\]/g,
    (_match, id: string, label: string) => `${id}[${quoteLabelIfNeeded(label)}]`,
  );

  normalized = normalized.replace(
    /^(\s*subgraph\s+[\w-]+)\[([^[\]]+)\](\s*)$/i,
    (_match, prefix: string, label: string, suffix: string) =>
      `${prefix}[${quoteLabelIfNeeded(label)}]${suffix}`,
  );

  return normalized;
}

function normalizeJourneyLine(line: string) {
  return line.replace(
    /^(\s*section\s+.+?):(\s*)$/i,
    (_match, sectionLabel: string, suffix: string) => `${sectionLabel}${suffix}`,
  );
}

export function normalizeMermaidCode(code: string) {
  const trimmed = code.trim();
  const firstMeaningfulLine = trimmed
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("%%"))
    ?.toLowerCase();

  if (!firstMeaningfulLine) {
    return trimmed;
  }

  if (
    firstMeaningfulLine.startsWith("flowchart ") ||
    firstMeaningfulLine.startsWith("graph ")
  ) {
    return trimmed.split("\n").map(normalizeFlowchartLikeLine).join("\n");
  }

  if (firstMeaningfulLine === "journey") {
    return trimmed.split("\n").map(normalizeJourneyLine).join("\n");
  }

  return trimmed;
}
