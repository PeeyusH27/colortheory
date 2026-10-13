# Architecture

ColorTheory is an Expo (SDK 57) app with Expo Router, an optional Supabase backend and pluggable
AI providers. It is designed so that **every screen works with no backend and no API keys**, and
so that nothing about a user's portrait is ever overstated or silently uploaded.

## Layers

```text
src/app/                     Routes only (Expo Router). Thin: compose components + hooks.
   │
src/features/*               Feature logic: hooks, state machines, engines, feature components
   │                         (auth, camera, analysis, outfits, profile, data queries, splash)
   │
src/services/*               Integrations behind interfaces:
   ├─ color-analysis/        ColorAnalysisProvider: on-device | remote | mock
   ├─ image-generation/      OutfitGenerationProvider: remote (FASHN via Edge Function) | mock
   ├─ data/                  DataRepository: LocalRepository (device) | SupabaseRepository (RLS)
   ├─ storage/               Private portrait storage, signed URLs, local files
   └─ supabase/              Client, chunked SecureStore session adapter, Edge Function caller
   │
src/components/*             Reusable UI (ui/, layout/, brand/, colors/, outfits/, camera/, analysis/)
src/theme/*                  Design tokens (colors, typography, spacing, radii, shadows, motion)
   │
supabase/                    Migrations (schema + RLS + storage), Edge Functions, RLS tests
```

Rules the code follows:

- Route files never call Supabase or providers directly; they use hooks from `src/features`.
- Components never hard-code colours, fonts or spacing; they read tokens from `src/theme`.
- Services throw `AppError` (`src/utils/errors.ts`) with a code; screens map codes to friendly copy
  via `ErrorState`/`InlineAlert`. Raw server messages are never shown.

## Key decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| **Expo SDK 57 + Expo Router in `src/app`** | Current SDK; `src/app` is the SDK 57 template default and keeps all code under `src/`. | Differs from the brief's root `app/` folder — same structure otherwise. |
| **On-device analysis is the default provider** | Private (no upload), offline, free, and it really reads the photo: exposure, colour cast, blur, and the average colour of skin-toned pixels in the face guide. | Heuristic. Results are labelled "On-device estimate", confidence is capped at 0.75, and users can adjust. |
| **Providers return characteristics; the palette engine is deterministic and client-side** | Same input → same palette, testable, provider-independent. A cloud model can never inject arbitrary colours or copy. | Palette quality depends on the curated 50-colour library rather than a model's taste. |
| **Mode A = colour drape, Mode B = AI try-on** | Mode A is the stylist's real technique (fabric under the chin) applied to the user's *unmodified* photo — honest and instant. Mode B is opt-in, consented, labelled "approximation". | Mode A doesn't show garments on the body; outfit *illustrations* (original SVG) do that job. |
| **Original SVG garment illustrations, no stock photos** | Exact recommended hex on every garment, no licensing questions, never mistaken for the user. | Illustrated rather than photographic. Licensed garment photos can be added for true try-on (`garment-references` bucket). |
| **Repository pattern (Local ↔ Supabase)** | Demo mode and signed-in mode share every screen. Local repository mirrors SQL semantics (cascades, detach-on-delete). | Two implementations to keep in sync — covered by tests. |
| **Supabase Auth, no custom JWT** | Sessions, refresh, email verification and reset are solved problems. | Express backend (if ever added) must verify Supabase JWTs — see `docs/SUPABASE.md`. |
| **Chunked SecureStore session adapter** | Requirement: tokens in Keychain/Keystore, not AsyncStorage. Sessions exceed iOS's ~2 KB item limit, so they're split. | Expo's Supabase guide now suggests `expo-sqlite/localStorage`; we chose the more protective store. |
| **`Stack.Protected` route guards + an anchor `index` route** | Declarative; sign-in/out swaps route groups without imperative navigation; no redirect loops. | The anchor doubles as the splash on cold start and a silent redirect afterwards. |
| **Zustand for workflow state, TanStack Query for server state** | No duplicated server data. Query keys include the user id (or `local`) so accounts never share cache. | Two state tools, each with a clear job. |
| **JS tabs with a custom tab bar** | The editorial capsule + centre "Analyze" button isn't possible with native tabs. | Slightly less "native" tab feel. |
| **Light editorial theme only** | The brand is cream paper + ink. Camera/analysis screens are dark by nature. | No system dark mode yet; tokens are semantic, so adding one is contained to `colors.ts`. |

## Screen map

| # | Screen | Route | Notes |
|---|---|---|---|
| 1 | Animated splash | `/` (`src/app/index.tsx`) | Anchor route; silent redirect after first play |
| 2 | Onboarding (3 pages) | `/onboarding` | Revisit from Settings/Profile (`?revisit=1`) |
| 3 | Welcome / auth | `/welcome`, `/sign-in`, `/sign-up`, `/forgot-password`, `/verify-email` | `(auth)` group, guarded `!authenticated` |
| — | Email link landing | `/auth-callback`, `/reset-password` | Unguarded; handle PKCE `?code=` and implicit fragments |
| 4 | Discover (home) | `/discover` | `(app)/(tabs)` |
| 5 | Camera | `/camera` | Slides up; permission / denied / unavailable states |
| 6 | Portrait confirmation | `/portrait-confirmation` | On-device quality check, method choice, explicit upload consent |
| 7 | Analysis progress | `/analysis` | Real stages, paced reveal, cancel/retry/quality gate |
| 8 | Results | `/results/[analysisId]` | Reference-inspired; adjust sheet; `?fresh=1` closes to home |
| 9 | Interactive palette | `/palette/[analysisId]` | Swatch selection drives outfits; copy hex; favourites |
| 10 | Outfit gallery | `/gallery/[analysisId]`, `/outfits` tab | Drape panels, carousel, combinations |
| 11 | Outfit details | `/outfit/[outfitId]?analysisId=` | Modal; swipe variations; AI preview (Mode B) |
| 12 | My Colors | `/colors` | Palettes, favourites, wardrobe, recent, custom collections |
| 13 | Profile | `/profile` | Device-only avatar, stats, account |
| 14 | History | `/history` | Delete a single session |
| 15 | Settings & privacy | `/settings`, `/portraits`, `/legal/[doc]` | Storage preference, deletes, account deletion |
| 16 | Shared states | `src/components/ui/*State.tsx`, `InlineAlert`, `ConfirmationModal`, `Toast`, `OfflineBanner` | |

## Navigation flow

```text
/ (splash, anchor)
 ├─ first launch ───────────────► /onboarding ──► /welcome ──► sign-in │ sign-up │ demo mode
 ├─ session or demo ────────────► /discover  (tabs: discover · colors · outfits · profile)
 └─ recovery link opened ───────► /reset-password

/discover ─ Analyze ─► /camera ─► /portrait-confirmation ─► /analysis ─► /results/:id (replace)
                                                                         ├─► /palette/:id
                                                                         └─► /gallery/:id ─► /outfit/:outfitId (modal)
/profile ─► /history │ /portraits │ /settings ─► /legal/:doc (modal)
```

Guards live in `src/app/_layout.tsx`:

```tsx
<Stack.Protected guard={!authenticated}><Stack.Screen name="(auth)" /></Stack.Protected>
<Stack.Protected guard={authenticated}><Stack.Screen name="(app)" /></Stack.Protected>
```

When auth state flips, Expo Router drops screens whose guard turned false and returns to the
anchor, which redirects via `useLaunchDestination()`. Signing in/out therefore never navigates
imperatively. The selected portrait lives in an in-memory store, so back/forward navigation
through the capture flow never loses it, and killing the app discards it.

## Animation ownership

One system per job, never stacked:

- **Native stack** (react-native-screens) owns screen-to-screen transitions: `fade` for the
  capture → analysis → results hand-off, `slide_from_bottom` for the camera and modals,
  `slide_from_right` elsewhere. Configured in the layouts.
- **Reanimated 4** owns everything inside a screen: the splash timeline, onboarding parallax,
  staggered entrances (`enterUp`/`enterRight`), press scales, swatch selection springs, analysis
  rings and marquee, bottom-sheet drag.
- All Reanimated animations use `ReduceMotion.System`; the splash and loops check
  `useReducedMotion()` and render static compositions instead.
- Only `transform`/`opacity` animate; SVG geometry is static.

## Analysis data flow

```text
Camera/Picker ─► normalizePortrait (resize ≤1280px, re-encode → drops EXIF/GPS, delete original)
             ─► portraitStore (memory)
Confirmation  ─► useQualityPreview: 256px thumbnail decoded in JS → exposure/cast/blur/face checks
             ─► user chooses method; upload only with an explicit consent tap
runAnalysis   ─► preparing: copy to app-private documents/ (unless cloud-only), create row
             ─► uploading (cloud only): POST to {uid}/{analysisId}/original.jpg with progress
             ─► provider.analyze(): checking_quality → estimating → palettes
             ─► outfits: verify the palette yields outfits → save result → (temporary cloud copy deleted)
             ─► on any failure/cancel: delete the row, local copy and uploaded object
Results       ─► palette, characteristics (with uncertainty), drapes, combinations, adjust sheet
```

## Security model (summary)

- The client ships only the Supabase URL and publishable/anon key. `config.ts` refuses secret or
  service-role keys if someone puts one in `EXPO_PUBLIC_*`.
- Every table has RLS; `user_id` defaults to `auth.uid()`; composite foreign keys stop cross-user
  attachments; storage paths are checked against `{auth.uid()}/{own analysis id}/…`.
- Real AI preview rows and images can only be written by the Edge Function (service role), so a
  stored "AI preview" is always genuine.
- Edge Functions verify the caller's JWT with Supabase Auth and never trust a user id from the
  body. Provider keys live only in function secrets.
- Portraits are private; access is via signed URLs that expire in 5–10 minutes.

Details and tests: `docs/SUPABASE.md`.

## Known limitations

- On-device analysis is a heuristic: no face landmarking, so a face outside the guide oval or a
  busy, skin-coloured background reduces accuracy. The app warns and caps confidence.
- Without licensed garment photos, AI previews use FASHN's experimental `edit` model with a text
  prompt instead of true garment-image try-on.
- Notifications, Google/Apple sign-in and dark mode are not implemented.
- The "Shades of Blue Style Guide" reference image was not included with the brief; the results
  layout follows its written description (navy masthead, multi-panel portraits, labelled swatches
  with hex codes, outfit suggestions, closing style statement).
