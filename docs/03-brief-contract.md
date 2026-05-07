# Brief Contract

## Purpose

Every AI generation must produce a stable contract-shaped object so the app can:

- render briefs consistently
- attach citations predictably
- support client comments by section
- support versioning and rollback
- validate output before persisting it

## Core Principle

The app does not store a vague LLM paragraph dump as its source of truth.

The source of truth is a structured `BriefSnapshot`.

## Canonical Types

### BriefSnapshot

```ts
type BriefSnapshot = {
  id: string;
  projectId: string;
  sessionId: string;
  version: number;
  status: "draft" | "shared" | "confirmed" | "superseded";
  summary: BriefClaim[];
  goals: BriefClaim[];
  ambiguities: BriefQuestion[];
  followUpQuestions: BriefQuestion[];
  sourceBundleVersion: number;
  createdBy: string;
  createdAt: string;
};
```

### BriefClaim

```ts
type BriefClaim = {
  id: string;
  text: string;
  confidence: "low" | "medium" | "high";
  evidence: EvidenceRef[];
};
```

### BriefQuestion

```ts
type BriefQuestion = {
  id: string;
  text: string;
  reason: string;
  status: "open" | "answered" | "resolved";
  clientResponse?: string | null;
  evidence: EvidenceRef[];
};
```

### EvidenceRef

```ts
type EvidenceRef = {
  sourceAssetId: string;
  sourceType: "text" | "audio" | "image" | "pdf";
  label: string;
  locator: EvidenceLocator;
  excerpt: string;
  previewUrl?: string | null;
};
```

### EvidenceLocator

```ts
type EvidenceLocator =
  | {
      kind: "text-range";
      messageIndex?: number;
      paragraphStart?: number;
      paragraphEnd?: number;
    }
  | {
      kind: "audio-range";
      startMs: number;
      endMs: number;
      transcriptChunk?: number;
    }
  | {
      kind: "pdf-range";
      page: number;
      paragraphStart?: number;
      paragraphEnd?: number;
    }
  | {
      kind: "image-note";
      regionLabel?: string;
      extractedHint?: string;
    };
```

### RevisionEvent

```ts
type RevisionEvent = {
  id: string;
  projectId: string;
  sessionId: string;
  snapshotId?: string | null;
  type:
    | "generated"
    | "regenerated"
    | "manual_edit"
    | "client_comment_added"
    | "client_answer_added"
    | "snapshot_restored";
  actorType: "internal_user" | "client" | "system";
  actorId?: string | null;
  summary: string;
  createdAt: string;
};
```

### BriefComment

```ts
type BriefComment = {
  id: string;
  snapshotId: string;
  section: "summary" | "goals" | "ambiguities" | "followUpQuestions";
  targetId?: string | null;
  authorName?: string | null;
  body: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
};
```

### FollowUpAnswer

```ts
type FollowUpAnswer = {
  id: string;
  snapshotId: string;
  questionId: string;
  body: string;
  authorName?: string | null;
  createdAt: string;
};
```

### ShareLink

```ts
type ShareLink = {
  id: string;
  snapshotId: string;
  token: string;
  status: "active" | "revoked";
  createdAt: string;
  expiresAt?: string | null;
};
```

## Rendering Rules

### Summary

`summary` is a list of clear claims about what the client wants.

Each entry should:

- be plain language
- be concise
- have evidence when support exists

### Goals

`goals` are the expected outcomes and success criteria inferred from the input.

Each goal should:

- describe desired behavior or deliverable
- be phrased as something that can later be validated

### Ambiguities

`ambiguities` identify blockers, missing context, or unresolved assumptions.

Each item should:

- explain what is unclear
- explain why it matters
- carry evidence where possible

### Follow-Up Questions

`followUpQuestions` are client-facing questions generated from the ambiguities.

Each one should:

- be answerable
- be specific
- map cleanly to client response collection

## Validation Rules

Before saving a snapshot:

- all four sections must exist
- each list can be empty, but should never be `null`
- each claim or question must have stable `id`
- each evidence reference must point to an existing source asset
- output must not be stored if the shape is invalid

## UX Rules

- citations are claim-level, not word-level
- clicking the citation icon should expose the exact source excerpt
- public clients comment by section or by target claim/question
- manual internal edits should create new snapshots or explicit events

## Versioning Rules

- every successful generation creates a new snapshot
- snapshots are immutable after persistence
- comments and answers attach to a specific snapshot
- regeneration consumes prior snapshots plus feedback and creates the next snapshot
