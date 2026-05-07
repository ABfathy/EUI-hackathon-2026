# Novelties

This document captures differentiators that strengthen the demo without violating the hackathon brief.

## Core Novelty Principles

- novelty must reinforce trust, clarity, or delight
- novelty must not blur the product into a PM tool
- novelty must not slow the main brief workflow

## Recommended Novelties

### 1. Evidence-Backed Brief Claims

Every generated claim or question can expose:

- exact source type
- source locator
- excerpt
- preview

Why it matters:

- it makes the AI output feel inspectable
- it improves trust immediately
- it is stronger than a plain summary generator

## 2. Brief-First Workspace

Make the brief the main artifact, not chat.

The workspace should feel like:

- a serious working surface
- an editable structured artifact
- a context-rich assistant around the brief

Why it matters:

- it feels more productized than a generic chatbot
- it aligns better with the hackathon brief

## 3. Contextual Refinement

Let internal users select a specific claim or section and ask for refinement against:

- metaknowledge
- recent client comments
- missing clarifications

Why it matters:

- it gives real operational value
- it keeps AI edits precise

## 4. Clean Public Review Experience

Clients should not just “approve”.

They should be able to:

- comment on a section
- answer generated questions
- confirm when satisfied

Why it matters:

- it closes the intake loop
- it gives the demo a stronger real-world feel

## 5. Processing-State UX

Do not leave users staring at a spinner.

Show:

- uploaded assets recognized
- extraction stages moving
- early placeholder context
- generation progress states

Why it matters:

- the system feels more alive
- it masks unavoidable async latency well

## 6. Selective Motion

Use motion only for:

- section insertion
- panel transitions
- share-link success states
- landing polish

Why it matters:

- the UI feels premium
- the core workspace stays readable

Recommended tools:

- `animejs`
- minimal `react-bits` usage

## 7. Haptic Success on Mobile

For supported devices only:

- upload success
- comment submitted
- brief confirmed

Why it matters:

- it makes the public mobile experience feel polished
- it is memorable without adding much complexity

Recommended tool:

- `web-haptics`

## Defer These Even If They Sound Cool

- WhatsApp and Telegram automation in core scope
- full inline client editing
- free-form multi-agent chat everywhere
- PM features after the brief
- broad CRM expansion

## Optional Later Novelty

These are good after the core product works:

- n8n ingestion adapters
- snapshot diff visualization
- source confidence heatmaps
- reusable brief templates by domain
