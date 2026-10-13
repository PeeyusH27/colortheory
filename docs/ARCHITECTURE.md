# Architecture

ColorTheory is a Next.js 16 website (App Router, React 19, Tailwind CSS 4) with an optional
Supabase backend and pluggable AI providers. It is designed so that **every page works with no
backend and no API keys**, and so that nothing about a user's portrait is ever overstated or
silently uploaded.

## Layers

```text
src/app/                     Routes. page.tsx files are thin server components that render a
   │                         colocated client "View" (e.g. discover/DiscoverView.tsx).
src/proxy.ts                 Runs before each request: refreshes the Supabase session cookie and
   │                         applies optimistic redirects (src/lib/routeGuard.ts).
src/features/*               Feature logic: hooks, state machines, engines, feature components
   │                         (auth, camera, analysis, outfits, colors, data queries, profile)
src/services/*               Integrations behind interfaces:
   ├─ color-analysis/        ColorAnalysisProvider: on-device (canvas) | remote | mock
   ├─ image-generation/      OutfitGenerationProvider: remote (FASHN via Edge Function) | mock
   ├─ shopping/              ShoppingProvider: store-search links (Myntra, Zara, Westside…); product feeds later
   ├─ data/                  DataRepository: LocalRepository (browser) | SupabaseRepository (RLS)
   ├─ storage/               localPortraits (IndexedDB) · portraitStorage (private buckets, signed URLs)
   └─ supabase/              Browser client (@supabase/ssr, cookie session), Edge Function caller
src/lib/*                    Route guard, server Supabase clients, query client, small helpers
src/components/*             Reusable UI (ui/, layout/, brand/, colors/, outfits/, camera/, analysis/)
src/app/globals.css          Design tokens as Tailwind v4 @theme variables; src/theme/colors.ts mirrors hexes
supabase/                    Migrations (schema + RLS + storage), Edge Functions (Deno), RLS tests
```

Rules the code follows:

- Route files never call Supabase or providers directly; views use hooks from `src/features`.
- Components use token utilities (`bg-navy`, `type-h2`, `shadow-offset`…), not ad-hoc values.
- Services throw `AppError` (`src/utils/errors.ts`) with a code; views map codes to friendly copy
  via `ErrorState`/`InlineAlert`. Raw server messages are never shown.

## Rendering model

The product is personal and interactive (camera, canvas, IndexedDB), so pages are **client
components inside prerendered shells**:

- `cacheComponents` and `partialPrefetching` are on. Every route has a static shell; dynamic
  routes (`/results/[analysisId]` …) read `useParams()` inside `<Suspense>` and stream the rest.
- Data is fetched **in the browser with the user's own session** (TanStack Query over the
  repository). Row Level Security is therefore the access boundary — the same model the backend
  was designed for, with no server-side copy of user data.
- Queries wait for auth state (`useAuthReady`), so a signed-in visitor never briefly sees, or
  writes to, browser-local demo data while the session is restored.
- The only server code is `proxy.ts` (cookie refresh + redirects) and `/auth/callback` (email
  links). Both use the public URL and publishable key — never a service-role key.

## Key decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| **Next.js App Router, client views** | Fast static shells and instant navigations; the heavy work (camera, pixels, IndexedDB) must run in the browser anyway. | Little server rendering of personal data; SEO matters only for the landing and legal pages, which are server-rendered. |
| **`@supabase/ssr` cookie sessions** | Lets `proxy.ts` refresh tokens and `/auth/callback` exchange email-link codes on the server. | The session cookie is readable by page JavaScript (needed by the browser client). Mitigated by no third-party scripts and strict security headers. |
| **Optimistic route guard in `proxy.ts` + client `AppGate`** | Signed-out visitors never download app pages; sessions that end while a page is open are handled client-side. | Not a security boundary — RLS and private Storage are. |
| **In-browser analysis is the default provider** | Private (no upload), offline, free, and it really reads the photo: exposure, colour cast, blur, and the average colour of skin-toned pixels in the face guide. | Heuristic. Results are labelled "On-device estimate", confidence is capped at 0.75, and users can adjust. |
| **Providers return characteristics; the palette engine is deterministic and client-side** | Same input → same palette, testable, provider-independent. A cloud model can never inject arbitrary colours or copy. | Palette quality depends on the curated 50-colour library rather than a model's taste. |
| **Portraits in IndexedDB, working photo in memory** | Blobs belong in IndexedDB (localStorage is small and string-only). The in-progress photo is never persisted, so a reload discards it. | Clearing site data removes local portraits; signed-in users can choose cloud storage instead. |
| **Mode A = colour drape, Mode B = AI try-on** | Mode A is the stylist's real technique (fabric under the chin) applied to the user's *unmodified* photo — honest and instant. Mode B is opt-in, consented, labelled "approximation". | Mode A doesn't show garments on the body; outfit *illustrations* (original SVG) do that job. |
| **Original SVG garment illustrations, no stock photos** | Exact recommended hex on every garment, no licensing questions, never mistaken for the user. | Illustrated rather than photographic. Licensed garment photos can be added for true try-on (`garment-references` bucket). |
| **Repository pattern (Local ↔ Supabase)** | Demo mode and signed-in mode share every page. The local repository mirrors SQL semantics (cascades, detach-on-delete). | Two implementations to keep in sync — covered by tests. |
| **Zustand for workflow state, TanStack Query for server state** | No duplicated server data. Query keys include the user id (or `local`) so accounts never share cache. Persisted stores use `skipHydration` so the first client render matches the server HTML. | Two state tools, each with a clear job. |
| **Shop links into store search, not scraped listings** | Myntra, Zara and Westside offer no public product API; scraping breaks their terms and copyright and is brittle. Links send only search words, need no keys and work for every store. | No product photos or prices in our UI, and store colour accuracy varies — the row shows our swatch beside each link. A `ShoppingProvider` can add real product cards from an affiliate feed or shopping API via an Edge Function. |
| **CSS animation, no animation library** | Entrances, rings, marquee and the landing splash are CSS keyframes on `transform`/`opacity`; `prefers-reduced-motion` collapses them globally. | No physics springs; not needed for this design. |
| **Native `<dialog>` for sheets** | Focus trap, inert background and Escape for free; slides up on phones, centred on desktop. | Older browsers fall back to a non-modal open dialog. |
| **Light editorial theme only** | The brand is cream paper + ink; analysis pages use ink panels. | No dark mode yet; tokens are centralised in `globals.css`, so adding one is contained. |

## Page map

| # | Page | Route | Notes |
|---|---|---|---|
| 1–3 | Landing (splash, introduction, welcome) | `/` | Animated hero, three chapters, privacy promises; `/?intro=1` lets members revisit |
| 3 | Auth | `/sign-in`, `/sign-up`, `/forgot-password`, `/verify-email`, `/reset-password` | Guest-only (except reset) |
| — | Email link handler | `/auth/callback` (route handler) | PKCE `?code=` and `?token_hash=&type=` |
| 4 | Discover (home) | `/discover` | Hero, latest story, palettes, trends, outfit rail, manifesto |
| 5 | Camera | `/analyze` | getUserMedia; permission / denied / unavailable / insecure states; upload |
| 6 | Portrait confirmation | `/analyze/confirm` | In-browser quality check, method choice, explicit upload consent |
| 7 | Analysis progress | `/analyze/progress` | Real stages, paced reveal, cancel/retry/quality gate |
| 8 | Results | `/results/[analysisId]` | Reference-inspired; adjust sheet; `?fresh=1` returns home |
| 9 | Interactive palette | `/palette/[analysisId]` | Swatch selection drives outfits; copy hex; favourites |
| 10 | Outfit gallery | `/gallery/[analysisId]`, `/outfits` | Drape panels, outfit rail, combinations, complete looks |
| 11 | Outfit details | `/outfit/[analysisId]/[outfitId]` | Variations; colour drape; AI preview (Mode B); "Shop this look" (`#shop`); `editorial` for samples |
| 12 | My Colors | `/colors` | Palettes, favourites, wardrobe, recent, custom collections |
| 13 | Profile | `/profile` | Browser-only avatar, stats, account |
| 14 | History | `/history` | Delete a single session |
| 15 | Settings & privacy | `/settings`, `/portraits`, `/legal/privacy`, `/legal/terms` | Storage preference, deletes, account deletion |
| 16 | Shared states | `components/ui/States.tsx`, `InlineAlert`, `ConfirmDialog`, `toast`, `OfflineBanner`, `error.tsx`, `not-found.tsx` | |

## Navigation flow

```text
/ (landing) ─► sign-up │ sign-in │ demo mode ─► /discover
/discover ─ Analyze ─► /analyze ─► /analyze/confirm ─► /analyze/progress ─► /results/:id?fresh=1 (replace)
                                                                            ├─► /palette/:id
                                                                            └─► /gallery/:id ─► /outfit/:id/:outfitId
/profile ─► /history │ /portraits │ /settings ─► /legal/privacy │ /legal/terms
Email links ─► /auth/callback ─► /discover (or /reset-password for recovery)
```

Navigation is a top bar on desktop and a bottom tab bar (with a central Analyze button) on
phones. The selected portrait lives in an in-memory store, so moving between the capture steps
keeps it; leaving the progress page cancels the run and cleans up.

## Analysis data flow

```text
Camera/upload ─► normalizePortrait: decode (EXIF orientation applied) → crop 4:5 (camera) →
                 resize ≤1280px → re-encode JPEG on a canvas (drops EXIF/GPS) → portraitStore (memory)
Confirmation  ─► useQualityPreview: 256px canvas sample → exposure/cast/blur/face checks
             ─► user chooses method; upload only with an explicit consent tick
runAnalysis   ─► preparing: save to IndexedDB (unless cloud-only), create the record
             ─► uploading (cloud only): XHR POST to {uid}/{analysisId}/original.jpg with progress
             ─► provider.analyze(): checking_quality → estimating → palettes
             ─► outfits: verify the palette yields outfits → save result → (temporary cloud copy deleted)
             ─► on any failure/cancel: delete the record, local copy and uploaded object
Results       ─► palette, characteristics (with uncertainty), drapes, combinations, adjust sheet
```

## Security model (summary)

- The browser receives only the Supabase URL and publishable/anon key. `config.ts` refuses secret
  or service-role keys if someone puts one in `NEXT_PUBLIC_*`.
- Security headers on every response: `nosniff`, `strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, and a `Permissions-Policy` that allows the camera for this origin only.
- Every table has RLS; `user_id` defaults to `auth.uid()`; composite foreign keys stop cross-user
  attachments; storage paths are checked against `{auth.uid()}/{own analysis id}/…`.
- Real AI preview rows and images can only be written by the Edge Function (service role), so a
  stored "AI preview" is always genuine.
- Edge Functions verify the caller's JWT and never trust a user id from the body. Provider keys
  live only in function secrets. CORS allows any origin because requests authenticate with a
  bearer token, never cookies.
- Portraits are private; access is via signed URLs that expire in 5–10 minutes. Email-link
  redirects only accept same-site paths (`safeNextPath`).

Details and tests: `docs/SUPABASE.md`.

## Known limitations

- In-browser analysis is a heuristic: no face landmarking, so a face outside the guide oval or a
  busy, skin-coloured background reduces accuracy. The site warns and caps confidence.
- Browsers other than Safari can't decode HEIC uploads; the site explains this.
- Without licensed garment photos, AI previews use FASHN's experimental `edit` model with a text
  prompt instead of true garment-image try-on.
- Notifications, Google/Apple sign-in and dark mode are not implemented.
- The "Shades of Blue Style Guide" reference image was not included with the brief; the results
  layout follows its written description (navy masthead, multi-panel portraits, labelled swatches
  with hex codes, outfit suggestions, closing style statement).
