# Tech Stack Choice

## Chosen Stack

- Frontend and app server: `Next.js` App Router on `Vercel`
- Styling: `Tailwind CSS`
- Internal auth: `Clerk`
- Database and file storage: `Supabase Postgres + Storage`
- ORM and migrations: `Prisma`
- Background jobs: `Inngest`
- AI inference: `@google/genai` using `Vertex AI`
- Unit and component testing: `Vitest`, `React Testing Library`, `@testing-library/jest-dom`
- E2E and responsive testing: `Playwright`
- Accessibility automation: `axe-core` in Playwright
- UI novelty: `react-bits`, `animejs`, `web-haptics`

## Why This Stack

### Next.js App Router

Use `Next.js` because the product needs:

- a fast landing page
- authenticated internal routes
- public share-link routes
- server route handlers
- file upload endpoints
- a single TypeScript codebase

This is the fastest path to shipping a real full-stack app in one week.

Reference:
- [Next.js docs](https://context7.com/vercel/next.js)

### Vercel

Use `Vercel` because the team wants:

- fast deployment
- minimal platform setup friction
- strong support for `Next.js`
- easy preview deployments during the hackathon

The tradeoff is that long-running work should not live in a normal request-response path. That is why async jobs are pushed into `Inngest`.

### Tailwind CSS

Use `Tailwind CSS` because the UI needs:

- fast iteration
- explicit responsive control
- strong desktop layout tuning
- tight implementation speed during a hackathon

The product is desktop-first for internal users, with mobile support for public review and light internal access.

### Clerk

Use `Clerk` for internal auth only.

Why:

- the hackathon brief requires frictionless public access for clients
- `Clerk` can protect internal routes while leaving selected share-link routes public
- it avoids spending hackathon time building auth

Clients do not need accounts in v1.

Reference:
- [Clerk docs](https://context7.com/clerk/clerk-docs)

### Supabase Postgres + Storage

Use `Supabase` as the quickest reliable backend for:

- managed `Postgres`
- file storage for uploads
- easy metadata access patterns

We are not using Supabase Auth because `Clerk` owns internal authentication.

### Prisma

Use `Prisma` for:

- clear schema definitions
- quick migrations
- team-friendly DX
- fast iteration during the hackathon

`Prisma` is preferred over `Drizzle` here because speed of onboarding and admin-side development matters more than lower-level SQL control.

### Inngest

Use `Inngest` for:

- durable async extraction jobs
- retries
- multi-step processing
- safe regeneration flows

This is important because PDF, image, and audio processing should not block user requests.

### Google Gen AI SDK on Vertex AI

Use `@google/genai` in `Vertex AI` mode because:

- the team constraint is to use GCP AI models
- the product needs multimodal handling
- the stack stays TypeScript-native

Default model assumption:

- `gemini-2.5-flash` for the main generation loop

Reference:
- [Google Gen AI JS SDK docs](https://context7.com/websites/googleapis_github_io_js-genai)

## Why Not Python in V1

Python is not required for this version.

The product does not currently depend on:

- custom model training
- offline data science workflows
- complex ETL
- advanced proprietary parsing pipelines

The core work is:

- ingesting files
- extracting text or metadata
- calling multimodal AI
- validating output against a strict contract
- storing revisions and evidence references

That fits comfortably inside TypeScript.

Python may be added later only if one of these becomes a hard bottleneck:

- advanced PDF layout extraction
- OCR quality control
- audio preprocessing
- evaluation pipelines
- retrieval/indexing experiments

## Rejected or Deferred Alternatives

### Cloud Run Monolith

Rejected for the hackathon because `Vercel` is faster for the main product workflow and iteration loop.

### GCP-Native Everything

Rejected because only AI must stay on GCP. For auth, hosting speed, and database DX, non-GCP tools are better for hackathon velocity.

### Drizzle ORM

Deferred, not rejected permanently.

It is a strong option, but `Prisma` is better for team speed in this project.

### Python AI Worker

Deferred until quality data proves it necessary.

## UI Novelty Dependencies

### react-bits

Use selectively for:

- landing page background
- empty states
- controlled decorative overlays

Do not use it in the core authenticated workspace if it hurts readability or performance.

Important:
- the repository currently states `MIT + Commons Clause`
- keep usage deliberate and document the dependency clearly

Reference:
- [react-bits](https://github.com/DavidHDev/react-bits)

### animejs

Use for:

- brief section reveal transitions
- panel open/close transitions
- subtle landing motion

Do not use it for heavy infinite motion in the work area.

Reference:
- [animejs](https://github.com/juliangarnier/anime)

### web-haptics

Use only on supported mobile devices and only for meaningful success actions.

Do not tie core UX to haptics.

Reference:
- [web-haptics](https://github.com/lochie/web-haptics)

## Planned Testing Stack

- `Vitest`
- `React Testing Library`
- `@testing-library/jest-dom`
- `Playwright`
- `axe-core`

Reference:
- [Vitest docs](https://context7.com/vitest-dev/vitest)
- [React Testing Library docs](https://context7.com/testing-library/react-testing-library)
- [Playwright docs](https://context7.com/microsoft/playwright)
