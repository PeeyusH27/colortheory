# Testing

## Automated (no credentials needed)

| Command | What runs |
|---|---|
| `npm test` | 162 Vitest tests in 16 files (jsdom, mocks only) |
| `npm run test:rls` | 55 schema + RLS scenarios on the real migrations (PGlite, no Docker) |
| `npm run typecheck` | `next typegen` (route types) + `tsc --noEmit` |
| `npm run lint` | ESLint (`eslint-config-next`, React Compiler rules) |
| `npm run build` | Production build; also validates prerendering under Cache Components |
| `npm run verify` | typecheck + lint + test + test:rls |

| Suite | Covers |
|---|---|
| `utils/__tests__/color.test.ts` | Hex parsing, Lab round-trips, **CIEDE2000 against published reference pairs**, WCAG contrast, AA check for the secondary text token |
| `features/analysis/__tests__/paletteEngine.test.ts` | Determinism, blue story for deep/cool, warm lean, section sizes, no duplicates/near-duplicates, light + dark neutrals, reasons, library-only colours, adjustments and reset |
| `features/analysis/__tests__/imageAnalysis.test.ts` | Synthetic portraits: good light passes; dark, faceless, warm-cast, flat/blurred and low-res photos are flagged; grey walls aren't skin; lean/depth/contrast ordering; confidence cap |
| `features/analysis/__tests__/runAnalysis.test.ts` | Planned stages, browser-local save (IndexedDB ref), cleanup on failure, quality gate, silent cancel, **no upload without sign-in or consent**, upload progress, temporary cloud copy deletion, cloud-only storage |
| `features/outfits/__tests__/recommendOutfits.test.ts` | Determinism, limits, colour interleaving, swatch filtering, experimental colours away from the face, neutrals from the user's palette, the reference looks, id round-trip |
| `features/auth/__tests__/schemas.test.ts` | Email trimming/format, password rules, matching confirmation, strength meter |
| `features/auth/__tests__/authService.test.ts` | Session restore without tokens in state, demo resume, unreadable storage, **expiry vs intentional sign-out**, recovery flag, friendly/non-revealing errors, email redirect back to this site, demo enter/exit (incl. the route-guard cookie), account deletion success/failure |
| `lib/auth/__tests__/completeAuthLink.test.ts` | PKCE code exchange, token-hash verification, recovery routing, expired/incomplete links, cross-browser sign-up message, **open-redirect protection** (`safeNextPath`) |
| `lib/__tests__/routeGuard.test.ts` | Signed-out → sign-in with `next`, members and demo admitted, guest-only pages, landing redirect and `?intro=1`, reset page needs a session, whole-segment prefix matching |
| `features/camera/__tests__/normalizePortrait.test.ts` | 4:5 centre crop for landscape webcams, tall phone frames and already-portrait frames |
| `services/color-analysis/__tests__/remoteProvider.test.ts` | Remote response schema (ranges, defaults), palette built locally, unusable → quality gate, quality check before calling the server, server errors, in-browser provider, mock labelled demo, cancellation |
| `services/supabase/__tests__/functions.test.ts` | Edge Function error codes → app errors, schema validation, network/cancel mapping |
| `services/image-generation/__tests__/generation.test.ts` | Job state walk, provider failure, transient retry, give-up, timeout, cancel, mock demo result, Edge Function status contract |
| `services/data/__tests__/localRepository.test.ts` | Ordering, cascading delete (portrait, previews, saved outfits) with palettes/favourites detached, portrait-only delete, favourite de-dup, idempotent save, rename/favourite/delete, stats, not-found |
| `constants/__tests__/config.test.ts` | Runs with no backend, publishable/anon keys, **refuses secret/service-role keys**, provider fallbacks, demo-mode defaults |
| `components/ui/__tests__/states.test.tsx` | Error (friendly copy, retry only when useful, code override), empty, loading (`status`), deletion confirmation phrase + details, consent checkbox, provenance explanations |

## Integration (real credentials, opt-in)

`npm run test:integration` signs in as two real test users with the publishable key and checks
RLS and storage isolation end to end. Skipped unless `SUPABASE_TEST_*` variables are set (see
`vitest.integration.config.mts`). Use a non-production project.

`npx supabase test db` runs the pgTAP file against the local Supabase stack (Docker).

Edge Functions are Deno code; typecheck them with `deno check supabase/functions/*/index.ts`
(run it on a copy outside the repository so Deno doesn't pick up the root `package.json`).

Not run in this repository's environment: the integration suite and pgTAP (no project/Docker
available). Run them before release.

## Visual and flow checks

During development the site was driven in headless Chrome at phone (390×844) and desktop
(1440×900) sizes: landing, demo mode, Discover, a real in-browser analysis of a synthetic
portrait (upload → quality check → progress → results), palette, gallery, outfit details with the
demo AI preview, My Colors, Profile, Settings and History. Repeat these after UI changes.

## Manual scenarios (browser)

### Authentication
- Sign up → "Confirm your email" → open the link in the same browser → lands signed in on Discover.
- Open the confirmation link in another browser → "Your email is confirmed. Sign in…" → password sign-in works.
- Wrong password → "That email and password don't match…" (no hint whether the email exists).
- Forgot password → link → set new password → signed in. Reuse the link → "Link expired".
- Reload / close and reopen the tab → still signed in. Go offline with a page open → offline banner; loaded lists keep rendering and actions show friendly errors.
- Revoke the session in the dashboard → next interaction returns to sign-in with "You were signed out".
- Demo mode → reload → still in demo; Profile → "Leave demo mode" → landing page.
- Signed out, open `/results/<id>` directly → sign-in, then back to that page after signing in.

### Camera and uploads
- `/analyze` first visit → explanation; "Allow camera" triggers the browser prompt (not before).
- Block the camera → "Camera access is off" with Upload instead; re-allow in site settings → reload works.
- No camera / camera in use elsewhere → "Camera unavailable" with Upload.
- Plain `http://` LAN address → "Camera needs a secure connection".
- Switch cameras on a phone; capture; confirmation shows the photo and the quality report.
- Switching tabs releases the camera (the browser's camera indicator turns off) and resumes on return.
- Dark room / lamp light / beauty filter photo → warnings or a quality gate with Retake.
- Upload: JPEG, PNG, WebP; HEIC in Chrome → clear message; a huge panorama; a screenshot without a face.
- Navigate away during analysis (nav link, back button) → run cancelled, nothing saved.

### Analysis and results
- In-browser: stages advance in order; results show "On-device estimate" and a confidence label.
- Cloud: consent box required; upload progress; results show "Cloud analysis"; without "Keep it in my private cloud storage" no cloud copy remains afterwards (check Storage).
- Network off mid-upload → retryable error; nothing left behind.
- Adjust → Warmer/Lighter updates the preview live; Save persists; "As estimated" restores.

### Images and deletion
- Delete a portrait → image gone (IndexedDB / Storage), results kept.
- Delete an analysis → record, portrait and AI previews gone; palettes stay (detached).
- Delete history → all sessions and portraits gone.
- Delete account (type DELETE) → user, rows and objects gone; site returns to the landing page.
- Settings → "Clean up unused images" after closing a tab mid-analysis.

### Accessibility, performance, browsers
- Keyboard only: skip link, nav, tabs (arrow keys), segmented controls, sheets (Escape closes, focus returns).
- Screen reader (VoiceOver / NVDA): icon buttons named; swatches announce name + hex; badges explain provenance; errors announced.
- `prefers-reduced-motion` → no entrance animations, spinning rings or marquee.
- Browser zoom 200% and large default font sizes → no overlapping text; tab bar stays usable.
- Safari (iOS + macOS), Chrome (Android + desktop), Firefox, Edge.
- Long lists (20+ analyses/palettes) scroll smoothly; rails snap.

## Release checklist

- [ ] `npm run verify` and `npm run build` green; integration + pgTAP run against staging.
- [ ] No secrets in the client bundle: after `npm run build`,
      `grep -rEo "sk-ant-[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,}" .next/static` finds nothing
      (the bare strings `sb_secret_` and `service_role` appear once, in the guard that rejects such keys).
- [ ] Supabase Site URL and redirect URLs point at the production origin (remove localhost).
- [ ] Email templates switched to the token-hash format (optional, recommended).
- [ ] `NEXT_PUBLIC_ENABLE_DEMO_MODE` decided for production.
- [ ] Privacy policy/terms published and `NEXT_PUBLIC_PRIVACY_URL` / `NEXT_PUBLIC_TERMS_URL` set.
- [ ] FASHN credits, quotas and `AI_PREVIEWS_ENABLED` checked; cleanup cron scheduled.
- [ ] Served over HTTPS (camera requirement).
