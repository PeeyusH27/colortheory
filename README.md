# ColorTheory

*Discover the colors that are yours.*

A personal colour-analysis and styling website built with Next.js 16 (App Router), React 19,
Tailwind CSS 4 and an optional Supabase backend. Take or upload a portrait, get a colour story with
an explained palette, see each colour draped against your own photo, explore outfits built around
your colours, shop each look at stores like Myntra, Zara and Westside, and save what you love. It
works on phones and desktops.

![ColorTheory on a phone: landing, Discover, analysis, results, outfit gallery, outfit details](docs/screenshots/overview.jpg)

**Discover → Capture → Analyze → Explore Colors → Preview Outfits → Shop & Save Your Style**

### Principles baked into the code

- **Works with no backend and no API keys.** In-browser analysis and demo mode cover every page.
- **Private by default.** Portraits are analysed in the browser and kept in its private site
  storage. Uploading needs an explicit consent tick each time, and goes to a private bucket only
  the user's account can read.
- **Honest output.** Every result says where it came from (On-device estimate · Cloud analysis ·
  Demo · Colour drape · AI preview), shows confidence and photo-quality warnings, and can be
  adjusted. Demo content is never presented as real AI output; drapes never alter the face.
- **No secrets in the browser.** Provider keys live in Supabase Edge Function secrets; the site
  refuses to create its client with a service-role key.

## Contents

- [Quick start](#quick-start-no-backend-needed)
- [Configuration](#configuration)
- [Connecting Supabase](#connecting-supabase)
- [Enabling AI](#enabling-ai)
- [Shopping links](#shopping-links)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Deploying](#deploying)
- [Troubleshooting](#troubleshooting)
- Deeper docs: [Architecture](docs/ARCHITECTURE.md) · [Design system](docs/DESIGN_SYSTEM.md) ·
  [Supabase](docs/SUPABASE.md) · [AI providers](docs/AI_PROVIDERS.md) · [Testing](docs/TESTING.md)

## Quick start (no backend needed)

Prerequisites: Node.js 20.9 or newer (Node 24 recommended) and a current Chrome, Safari, Firefox
or Edge.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. On the landing page choose **Explore in demo mode**. Everything
runs in your browser; no account needed.

- **Camera:** on **Analyze**, press **Allow camera** and accept the browser prompt. Browsers only
  allow the camera on `https://` or `localhost`. To try it on your phone over the same Wi-Fi, run
  `npx next dev -H <your-computer's-LAN-IP> --experimental-https`, open
  `https://<LAN-IP>:3000` on the phone and accept the self-signed certificate warning — or just
  use **Upload a photo**.
- **No camera?** Use **Upload**, or on Discover choose **No camera? See a sample result (demo)**.

## Configuration

Copy `.env.example` to `.env.local` (git-ignored). Everything is optional.

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | — | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | — | Publishable key (`sb_publishable_…`); or `NEXT_PUBLIC_SUPABASE_ANON_KEY` on legacy projects |
| `NEXT_PUBLIC_ANALYSIS_PROVIDER` | `device` | `device` (in the browser) · `remote` (Edge Function + Claude vision) · `mock` |
| `NEXT_PUBLIC_OUTFIT_GENERATION` | `mock` | `mock` · `remote` (Edge Function + FASHN) · `off` |
| `NEXT_PUBLIC_ENABLE_DEMO_MODE` | on without Supabase / in dev | Offer "Explore in demo mode" |
| `NEXT_PUBLIC_PRIVACY_URL`, `NEXT_PUBLIC_TERMS_URL` | — | Your published legal pages |
| `NEXT_PUBLIC_SHOP_LINK_TEMPLATE` | — | Optional affiliate redirect for shop links (`https://…{url}…`); links are then marked sponsored and disclosed |

**Public vs secret.** `NEXT_PUBLIC_*` values are inlined into the JavaScript every visitor
downloads — only values designed to be public go there (the Supabase URL and publishable/anon
key are; Row Level Security protects the data). Secrets — service-role or `sb_secret_` keys,
`ANTHROPIC_API_KEY`, `FASHN_API_KEY`, `CLEANUP_SECRET`, database passwords — go only in
`supabase/functions/.env` / `npx supabase secrets set`. `src/constants/config.ts` validates the
variables, reports problems in development (Settings → Developer diagnostics), and refuses
secret/service-role keys.

`NEXT_PUBLIC_*` values are fixed at build time: restart `npm run dev` after edits, and rebuild
for production.

## Connecting Supabase

Short version (details, RLS testing and the cleanup schedule in [docs/SUPABASE.md](docs/SUPABASE.md)):

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push                                   # schema, RLS, private buckets
```

1. Put the URL and publishable key in `.env.local`.
2. Authentication → URL configuration: **Site URL** `http://localhost:3000` (your production
   origin later) and **Redirect URLs** `http://localhost:3000/**` plus `https://<your-domain>/**`.
3. Restart `npm run dev` → the landing page now offers sign-up and sign-in.

Sessions live in first-party cookies managed by `@supabase/ssr`; `src/proxy.ts` refreshes them
and `/auth/callback` completes email links on the server.

## Enabling AI

```bash
cp supabase/functions/.env.example supabase/functions/.env   # add ANTHROPIC_API_KEY / FASHN_API_KEY
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy analyze-portrait
npx supabase functions deploy generate-outfit
npx supabase functions deploy delete-account
npx supabase functions deploy cleanup-orphans --no-verify-jwt
```

Set `NEXT_PUBLIC_ANALYSIS_PROVIDER=remote` and/or `NEXT_PUBLIC_OUTFIT_GENERATION=remote`.
Cloud analysis uses Claude (`claude-opus-5-5`) with JSON-schema output; AI outfit previews use
FASHN virtual try-on. The browser only ever calls these through the Edge Functions. See
[docs/AI_PROVIDERS.md](docs/AI_PROVIDERS.md) for the provider comparison (pricing, free tiers,
licensing, retention), quotas and the garment-photo workflow.

## Shopping links

Every outfit, palette colour and colour sheet has **Shop this look / Shop this colour** links into
each store's own search, built from the user's colours: our editorial colour name is translated to
an everyday store term (Petrol Blue → "teal blue"), combined with the garment ("blazer", "midi
skirt", "loafers") and the shopper's choice of All / Women / Men. Stores: Myntra, Zara, Westside,
AJIO and H&M by default; Uniqlo, Tata CLiQ and Amazon Fashion can be switched on in
Settings → Shopping.

- **No scraping, no copied listings, no keys.** Myntra, Zara and Westside don't offer public product
  APIs, and scraping them breaks their terms, so the site links to their search instead. The store
  receives only the search words.
- **Store URL formats** were checked on 2026-10-13: Westside, Tata CLiQ and Amazon loaded live;
  Myntra's format matches real links its search produces; Zara, AJIO, H&M and Uniqlo block
  automated browsers, so click-test them in Settings → Developer diagnostics → Store link check
  (development only). Formats live in `src/features/shop/retailers.ts`.
- **Earning commission:** join an affiliate network that carries the stores (Myntra is available
  through networks such as vCommission, Cuelinks, EarnKaro and Admitad; Zara has no open
  programme) and set `NEXT_PUBLIC_SHOP_LINK_TEMPLATE` to the network's deep-link format.
- **Product cards later:** links are produced by a `ShoppingProvider`
  (`src/services/shopping/`). A provider backed by an affiliate product feed or a shopping-search
  API can add `products()` — with its key in a Supabase Edge Function, never in the browser.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` | Route types + TypeScript (strict) |
| `npm run lint` | ESLint (`eslint-config-next`, React Compiler rules) |
| `npm test` | Vitest unit/component tests (mocks only) |
| `npm run test:rls` | Schema + RLS scenarios on the real migrations (PGlite, no Docker) |
| `npm run test:integration` | Two-account RLS checks against a real test project (needs credentials) |
| `npm run verify` | typecheck + lint + test + test:rls |

## Project structure

```text
src/
├── app/                         Next.js routes (App Router)
│   ├── layout.tsx  globals.css  fonts, design tokens (Tailwind @theme), providers
│   ├── page.tsx                 landing + introduction (replaces splash/onboarding/welcome)
│   ├── (auth)/                  sign-in, sign-up, forgot-password, verify-email
│   ├── reset-password/  legal/privacy/  legal/terms/  not-found.tsx  error.tsx
│   ├── auth/callback/route.ts   email-link handler (PKCE code / token hash → session cookie)
│   └── (app)/                   app shell (nav + client auth gate)
│       ├── discover/  colors/  outfits/  profile/
│       ├── analyze/  analyze/confirm/  analyze/progress/
│       ├── results/[analysisId]/  palette/[analysisId]/  gallery/[analysisId]/
│       ├── outfit/[analysisId]/[outfitId]/
│       └── history/  settings/  portraits/
├── proxy.ts                     session refresh + optimistic route guard (Next 16 "proxy")
├── components/                  ui/, layout/, brand/, colors/, outfits/, camera/, analysis/
├── features/                    auth, camera (getUserMedia, canvas), analysis (engines + workflow),
│                                outfits, colors, shop (stores + search terms), data (TanStack Query hooks), profile
├── services/                    color-analysis, image-generation, shopping, data (repositories),
│                                storage (IndexedDB + private buckets), supabase
├── lib/                         route guard, Supabase server clients, query client, helpers
├── store/  theme/  types/  utils/  constants/  mocks/  test/
supabase/                        migrations, Edge Functions (Deno), RLS tests, config.toml
docs/                            architecture, design system, Supabase, AI providers, testing
```

## Testing

`npm run verify` runs 176 Vitest tests (colour science against published CIEDE2000 values,
palette/outfit engines, synthetic-image quality checks, auth flows and email-link handling, the
route guard, the analysis orchestrator's consent and cleanup rules, provider/Edge Function
contracts, repositories, store search links and shared UI states) plus 55 database scenarios that load the real
migrations and act as two users, `anon` and the service role. Credentialed integration tests and
manual browser scenarios are in [docs/TESTING.md](docs/TESTING.md).

## Deploying

Any Node.js host that runs Next.js works (Vercel, Netlify, Fly, a container with `npm start`).

1. Set the `NEXT_PUBLIC_*` variables in the host's environment **before building**.
2. Add the production origin to Supabase Auth: Site URL and `https://<your-domain>/**`.
3. Serve over HTTPS (the camera requires it).
4. Decide `NEXT_PUBLIC_ENABLE_DEMO_MODE` for production, and link reviewed legal pages.

## Troubleshooting

| Problem | Try |
|---|---|
| Changed `.env.local` but nothing changed | Restart `npm run dev`; rebuild for production (values are inlined at build time). Variables must start with `NEXT_PUBLIC_` |
| Config warnings | Settings → Developer diagnostics (development only) lists issues |
| "Camera needs a secure connection" | Use `localhost` or HTTPS; on a phone, use an HTTPS tunnel or Upload |
| "Camera access is off" | Re-enable the camera for this site in the browser's site settings (camera icon in the address bar), then reload |
| "Camera unavailable" | No camera found, or another app is using it — close it or use Upload |
| HEIC photo won't open | Chrome/Firefox can't decode HEIC; export as JPEG, or use Safari |
| "No portrait selected" after a reload | Working photos are kept in memory only; take or upload it again |
| Sign-up link says it was opened in a different browser | PKCE links only work in the browser that requested them; your email is confirmed — sign in with your password. Optional: switch the email templates to the token-hash format in [docs/SUPABASE.md](docs/SUPABASE.md) |
| Email link lands on an error page | Add `http://localhost:3000/**` (and your production origin) to Supabase redirect URLs |
| Signed out unexpectedly | Refresh token revoked/expired — sign-in says so; sign in again |
| Storage "row-level security" error on upload | The analysis row must exist and the path must be `{uid}/{analysisId}/original.jpg`; check `db push` applied the storage migration |
| Upload fails / stalls | Check the connection (offline banner) and file size; retry from the analysis page |
| "Cloud analysis isn't configured" | Deploy `analyze-portrait` and set `ANTHROPIC_API_KEY`; or switch back to `NEXT_PUBLIC_ANALYSIS_PROVIDER=device` |
| AI preview errors | `FASHN_API_KEY` set? Credits left? Daily limit (`AI_PREVIEW_DAILY_LIMIT`)? Portrait stored in the cloud? Function logs: dashboard → Edge Functions |
| CORS error calling an Edge Function | Redeploy the functions (the shared CORS headers allow every header the SDK sends) |
| Edge Function 401 at the gateway | Projects on asymmetric JWT keys: set `verify_jwt = false` for user-facing functions (they verify tokens in code) |
| Demo data disappeared | It lives in this browser's site storage; clearing site data or a private window removes it |

## Notes

- This repository previously contained an Expo/React Native app; it was replaced by this
  website. The last native version is in git history (commit `fea7d80`).
- The **"Shades of Blue Style Guide" reference image** wasn't included with the brief. The
  results page follows its written description: navy masthead with serif title, a row of
  portrait panels in different blues with labels, labelled swatches with hex codes, outfit
  suggestions and a closing style statement.
- In-browser analysis is a heuristic estimate from one photo, not a diagnosis; the site says so
  wherever results appear.
- `LICENSE` is the MIT license inherited from the original template — replace it with your own.
