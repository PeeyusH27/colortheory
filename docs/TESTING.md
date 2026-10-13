# Testing

## Automated (no credentials needed)

| Command | What runs |
|---|---|
| `npm test` | 150 Jest tests in 14 suites (mocks only) |
| `npm run test:rls` | 55 schema + RLS scenarios on the real migrations (PGlite, no Docker) |
| `npm run typecheck` | `tsc --noEmit` with typed routes |
| `npm run lint` | ESLint (`eslint-config-expo`, React Compiler rules) |
| `npm run verify` | all of the above |

| Suite | Covers |
|---|---|
| `utils/__tests__/color.test.ts` | Hex parsing, Lab round-trips, **CIEDE2000 against published reference pairs**, WCAG contrast, AA check for the secondary text token |
| `features/analysis/__tests__/paletteEngine.test.ts` | Determinism, blue story for deep/cool, warm lean, section sizes, no duplicates/near-duplicates, light + dark neutrals, reasons, library-only colours, adjustments and reset |
| `features/analysis/__tests__/imageAnalysis.test.ts` | Synthetic portraits: good light passes; dark, faceless, warm-cast, flat/blurred and low-res photos are flagged; grey walls aren't skin; lean/depth/contrast ordering; confidence cap |
| `features/outfits/__tests__/recommendOutfits.test.ts` | Determinism, limits, colour interleaving, swatch filtering, experimental colours away from the face, neutrals from the user's palette, the reference looks (navy shirt + light trousers, knit + dark denim), id round-trip |
| `features/auth/__tests__/schemas.test.ts` | Email trimming/format, password rules, matching confirmation, strength meter |
| `features/auth/__tests__/authService.test.ts` | Session restore without tokens in state, demo resume, corrupt storage, **expiry vs intentional sign-out**, recovery flag, friendly/non-revealing errors, verification redirect, PKCE/implicit/expired/incomplete links, demo enter/exit, account deletion success/failure |
| `features/analysis/__tests__/runAnalysis.test.ts` | Planned stages, local save, cleanup on failure, quality gate, silent cancel, **no upload without sign-in or consent**, upload progress, temporary cloud copy deletion, cloud-only storage |
| `services/color-analysis/__tests__/remoteProvider.test.ts` | Remote response schema (ranges, defaults), palette built locally, unusable → quality gate, on-device check before upload, server errors, on-device provider, mock labelled demo, cancellation |
| `services/supabase/__tests__/functions.test.ts` | Edge Function error codes → app errors, schema validation, network/cancel mapping |
| `services/supabase/__tests__/secureSessionStorage.test.ts` | Chunked SecureStore round-trip, shrink cleanup, partial writes, sign-out |
| `services/image-generation/__tests__/generation.test.ts` | Job state walk, provider failure, transient retry, give-up, timeout, cancel, mock demo result, Edge Function status contract |
| `services/data/__tests__/localRepository.test.ts` | Ordering, cascading delete (portrait, previews, saved outfits) with palettes/favourites detached, portrait-only delete, favourite de-dup, idempotent save, rename/favourite/delete, stats, not-found |
| `components/ui/__tests__/states.test.tsx` | Error (friendly copy, retry only when useful, code override), empty, loading (`progressbar`), deletion confirmation phrase, consent checkbox, provenance labels |

## Integration (real credentials, opt-in)

`npm run test:integration` signs in as two real test users with the publishable key and checks
RLS and storage isolation end to end. Skipped unless `SUPABASE_TEST_*` variables are set (see
`jest.integration.config.js`). Use a non-production project.

`npx supabase test db` runs the pgTAP file against the local Supabase stack (Docker).

Not run in this repository's CI environment: the integration suite and pgTAP (no project/Docker
available). Run them before release.

## Manual scenarios (device)

### Authentication
- Sign up → "Confirm your email" → open link on the phone → lands signed in.
- Open the confirmation link on a laptop → sign in on the phone with the password works.
- Wrong password → "That email and password don't match…" (no hint whether the email exists).
- Forgot password → link → set new password → signed in. Reuse the link → "Link expired".
- Kill and relaunch → still signed in (splash → Discover). Airplane mode relaunch → still signed in, offline banner.
- Revoke the session in the dashboard (or wait out refresh failure) → returned to Welcome with "You were signed out".
- Demo mode → relaunch → still in demo; "Leave demo mode" → Welcome.

### Camera and gallery
- First camera open → explanation screen; "Allow camera" triggers the OS prompt (not before).
- Deny → "Camera access is off" with Open Settings and Upload instead.
- Simulator / no camera → "Camera unavailable" with Upload.
- Flip cameras; capture; confirmation shows the photo and the quality report.
- Dark room / lamp light / beauty filter photo → warnings or a quality gate with Retake.
- Gallery: HEIC (iOS), large panorama, screenshot without a face → handled with a clear message.
- Back/forward between camera, confirmation and analysis never loses the portrait.
- Android hardware back on Analysis cancels cleanly; on fresh Results returns home.

### Analysis and results
- On-device: stages advance in order; results show "On-device estimate" and a confidence label.
- Cloud: consent box required; upload progress; results show "Cloud analysis"; "keep on device" leaves no cloud copy afterwards (check Storage).
- Network off mid-upload → retryable error; nothing left behind.
- Adjust → Warmer/Lighter updates the preview live; Save persists; "As estimated" restores.

### Images and deletion
- Delete a portrait → image gone (device folder / Storage), results kept.
- Delete an analysis → row, portrait and AI previews gone; palettes stay (detached).
- Delete history → all sessions and portraits gone.
- Delete account (type DELETE) → user, rows and objects gone; app returns to Welcome.
- Settings → Clean up unused files after force-quitting mid-analysis.

### Offline, errors, performance
- Offline banner appears/disappears; cached lists still render; actions show friendly errors.
- Splash on a low-end Android: smooth, < 3 s, tap to skip; Reduce Motion → static, quick fade.
- Long lists (20+ analyses/palettes) scroll smoothly; carousels snap.
- Large Dynamic Type: headings don't overflow; buttons stay tappable.
- VoiceOver/TalkBack: every icon button has a name; swatches announce name + hex; badges explain provenance.

## Release checklist

- [ ] `npm run verify` green; integration + pgTAP run against staging.
- [ ] `npx expo-doctor` clean (needs network access to the Expo API).
- [ ] No secrets bundled: `npx expo export --platform ios --platform android` then
      `grep -a -E "sk-ant-|sb_secret_[A-Za-z0-9]{8}|service_role\"" dist/_expo/static/js/*/*.hbc` finds nothing.
- [ ] Supabase redirect URLs exclude `exp://**` in production.
- [ ] `EXPO_PUBLIC_ENABLE_DEMO_MODE` decided for production.
- [ ] Privacy policy/terms published and URLs set; App Store privacy labels reflect camera/photos, optional cloud upload and third-party AI processing.
- [ ] FASHN credits, quotas and `AI_PREVIEWS_ENABLED` checked; cleanup cron scheduled.
- [ ] `eas build --profile production` for both platforms; test on physical devices.
