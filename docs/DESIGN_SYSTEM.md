# Design system

Source of truth: `src/theme/*.ts`. Components read tokens; screens never hard-code colours,
font sizes or spacing.

Direction: **maximalism meets editorial fashion**. Expressive where it delights (splash,
onboarding, Discover hero, results masthead, manifesto block); restrained where people need to
concentrate (camera, auth forms, settings).

## Colour

### Palette (`palette`)

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0D1626` | Deepest navy: splash, camera chrome, inverse sections |
| `navy` | `#172A46` | Primary text, primary buttons, keylines |
| `indigo` | `#2B2F77` | Brand blue accent |
| `denim` | `#2E5B89` | Accent text, focus ring, italic headline accents |
| `petrol` | `#0F4C5C` | Decorative |
| `teal` | `#176B6B` | Decorative |
| `steel` | `#4682B4` | Decorative / large text only |
| `sky` | `#A7C7E7` | Accent on dark surfaces |
| `mist` | `#DCE8F4` | Info backgrounds |
| `cream` | `#F7F3EC` | App background, text on dark |
| `sand` | `#EDE6DA` | Secondary background, chips |
| `linen` | `#E4DACB` | Dividers on cream, inactive tracks |
| `paper` | `#FFFFFF` | Cards, inputs |
| `charcoal` | `#20232B` | Alternative dark text |
| `muted` | `#5E6774` | Secondary text |
| `slate` | `#727B87` | Tertiary text, icons, rules |
| `border` / `borderWarm` | `#D9DDE3` / `#DDD4C6` | Hairlines |
| `coral` | `#FF6B4A` | Hero CTA, shutter, offset shadows |
| `coralText` | `#C2410C` | Coral when it must be text |
| `violet`, `lilac`, `saffron`, `blush`, `camel`, `sage` | | Maximalist splash/editorial accents |
| `success` / `warning` / `error` | `#1E7A4C` / `#9A5B00` / `#B42318` | Status (+ `*Soft` backgrounds) |

**Refinements from the brief:** `ink` was split from `navy` (two distinct depths are needed);
the brief's `muted #727B87` measures **3.9:1** on cream — below WCAG AA for body text — so it is
kept as `slate` for icons/rules and `muted` is darkened to `#5E6774` (**5.2:1**). A unit test
guards this.

Contrast on cream: navy 13.0:1 · denim 6.4:1 · petrol 8.6:1 · teal 5.7:1 · coralText 4.7:1 ·
success 4.8:1 · warning 4.9:1 · error 5.9:1. Steel (3.7:1) and sky are decorative only on light
backgrounds. Text placed on recommendation colours uses `readableOn(hex)`, which picks navy or
cream by contrast.

### Semantic tokens (`colors`)

`background.{primary, secondary, inverse, camera}` · `text.{primary, secondary, tertiary,
inverse, inverseSecondary, accent, emphasis, onAction, success, warning, error}` ·
`surface.{primary, elevated, sunken, inverse, scrim, cameraChrome}` · `border.{subtle, warm,
strong, inverse, focus}` · `action.{primary, primaryPressed, primaryDisabled, secondary,
secondaryBorder, accent, destructive}` · `status.*` · `splash[]`.

## Typography

Playfair Display (high-contrast serif) for the editorial voice; DM Sans for UI and body; DM Mono
for hex codes and numerals. Loaded with `expo-font`; the native splash stays up until they load
(max 4 s), then `resolveFontFamily` falls back to platform serif/sans/mono so text never vanishes.

| Variant | Font | Size / line | Notes |
|---|---|---|---|
| `displayXL` | Playfair Black | 64 / 64 | Responsive ±15%, max scale 1.1 |
| `displayL` | Playfair Bold | 46 / 50 | Responsive |
| `h1` | Playfair Bold | 34 / 40 | Responsive |
| `h2` | Playfair SemiBold | 26 / 32 | |
| `h3` | DM Sans Bold | 18 / 24 | |
| `editorial` | Playfair Italic | 22 / 30 | Decks and accents |
| `bodyL` / `bodyM` / `bodyS` | DM Sans | 17/26 · 15/22 · 13/19 | Max scale 1.6 |
| `label` | DM Sans Bold | 15 / 20 | Buttons, list titles |
| `caption` | DM Sans Medium | 12 / 16 | |
| `eyebrow` | DM Sans Bold | 11 / 14 | Uppercase, +2.2 tracking |
| `hex` | DM Mono Medium | 13 / 18 | Uppercase |
| `numeric` | DM Mono | 15 / 20 | Section numbers, stats |

Dynamic Type stays on; each variant caps `maxFontSizeMultiplier` so oversized headlines can't
break layouts. `<Text italic>` switches serif variants to their italic cut (`fontStyle` alone
doesn't pick a custom font file on Android).

## Spacing (4-point grid)

`spacing[1..16]` = 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

Layout: screen gutter 20 · section gap 40 (compact 32) · card padding 16 · grid/card gap 12 ·
tab bar 64 (+ clearance 88) · minimum touch target 44 · max content width 560.

## Radii, borders, shadows

- Radii: `none 0 · xs 2 · sm 6 · md 12 · lg 20 · xl 28 · pill 999`.
- **Editorial content is square** (portrait frames, colour blocks, palette and outfit cards with
  1.5 pt ink keylines); **controls are rounded** (pill buttons, 12 pt inputs, 28 pt sheet tops).
- Borders: hairline, 1, 2 (section rules), 3.
- Shadows use cross-platform `boxShadow`: `subtle`, `raised`, `floating`, and hard **offset
  print shadows** (`offsetInk`, `offsetCoral`, `offsetSky`, `offsetSmall`) for layered editorial
  cards.
- Texture: `GrainOverlay` tiles a 160 px noise PNG over cream surfaces (one draw call).

## Motion

| Token | Value |
|---|---|
| Durations | instant 90 · micro 140 · press 120 · quick 200 · base 280 · slow 420 · slower 650 · stagger 60 · analysis stage min 750 · splash ≈2.6 s (reduced 0.9 s) · toast 3.2 s |
| Easing | standard (0.2,0,0,1) · decelerate (0,0,0,1) · accelerate (0.3,0,1,1) · editorial (0.65,0,0.35,1) |
| Springs | press · selection · gentle · sheet · splash |
| Scales | pressed 0.96 · selected 1.08 |
| Helpers | `enterUp(i)`, `enterRight(i)`, `fadeIn()`, `fadeOut()` — all `ReduceMotion.System` |

`enterUp` deliberately uses the predefined `FadeInDown` keyframe: customising it with
`withInitialValues` makes Reanimated's web backend pin elements `position: absolute`, which
collapsed layouts during QA.

## Components

`src/components/ui`: `Text`, `PressableScale`, `PrimaryButton`, `SecondaryButton`, `TextButton`,
`IconButton`, `Avatar`, `Badge`, `ProvenanceBadge`, `Divider`, `GrainOverlay`, `EmptyState`,
`LoadingState`, `ErrorState`, `InlineAlert`, `ConfirmationModal`, `BottomSheet`, `Toast`
(`ToastHost` + `toast.*`), `FormField`/`ControlledFormField`, `Checkbox`, `SegmentedControl`,
`ListRow`.

`src/components/layout`: `ScreenContainer`, `EditorialHeader`, `SectionHeader`, `BottomTabBar`,
`OfflineBanner`.

`src/components/brand`: `ColorTheoryLogo` / `ColorWheelMark`, `Blob`, `SplashColorShapes`,
`EditorialArt` (`SwatchFan`, `DrapePanels`, `PaletteStack`).

`src/components/colors`: `ColorSwatch`, `ColorPalette`, `ColorPaletteCard`, `PaletteStrip`,
`CombinationCard`, `ColorDetailSheet`.

`src/components/outfits`: `GarmentIllustration` (shirt, tee, knit, jacket, coat, trousers, jeans,
skirt, dress, shoes, accessory), `OutfitFlatLay`, `DrapePreview`, `PortraitFrame`, `OutfitCard`,
`OutfitCarousel`, `SavedOutfitCard`.

`src/components/camera`: `FaceGuideOverlay`, `CameraControls`, `CameraTipsPanel`,
`ImageQualityNotice`. `src/components/analysis`: `AnalysisProgress`, `CharacteristicScale`,
`AnalysisHistoryItem`.

Accessibility conventions: every icon-only control requires `accessibilityLabel`; selectable
swatches/tabs/checkboxes expose `selected`/`checked` state; headers use `accessibilityRole`;
errors are `alert`s; progress indicators are accessible `progressbar`s; minimum 44 pt targets
(`hitSlop` where visuals are smaller); provenance badges carry full spoken explanations.
