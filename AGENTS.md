ColorTheory is a Next.js (App Router) website backed by Supabase (Auth, Postgres with RLS, private Storage, Edge Functions). Most screens are client components; data is read in the browser with the user's own session, so Row Level Security is the access boundary.

## Commands

```bash
npm run dev          # start the dev server (http://localhost:3000)
npm run build        # production build (also typechecks)
npm run typecheck    # next typegen + tsc --noEmit
npm run lint         # ESLint (eslint-config-next, React Compiler rules)
npm test             # Vitest unit/component tests
npm run test:rls     # schema + RLS scenarios on the real migrations (PGlite, no Docker)
npm run verify       # all of the above except build
```

Run typecheck, lint and tests before declaring any task done.

## Rules

- Never put privileged credentials in `NEXT_PUBLIC_*` variables or client code. Provider keys and service-role keys live in Supabase Edge Function secrets only.
- Portraits stay in the browser (IndexedDB) unless the user explicitly consents to an upload. Uploads go to private buckets; display them through short-lived signed URLs.
- Label demo and AI output honestly (`ProvenanceBadge`); keep uncertainty visible.
- Pages that read `useParams`/`useSearchParams` must sit behind `<Suspense>` (Cache Components is on).
- Edge Functions in `supabase/functions` are Deno code and are excluded from the Next.js TypeScript project.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
