# Design system

Source of truth: the `@theme` block in `src/app/globals.css` (Tailwind CSS v4). Every token there
becomes a utility (`bg-navy`, `text-muted`, `shadow-offset`, `animate-enter-up`…).
`src/theme/colors.ts` mirrors the palette for code that needs raw hex values (SVG art, contrast
checks), and `src/theme/motion.ts` holds the few timings used from JavaScript.

Direction: **maximalism meets editorial fashion**. Expressive where it delights (landing hero,
Discover hero, results masthead, manifesto block); restrained where people need to concentrate
(camera, auth forms, settings).

## Colour

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0D1626` | Deepest navy: hero, camera frame, inverse sections |
| `navy` | `#172A46` | Primary text, primary buttons, keylines |
| `indigo` | `#2B2F77` | Brand blue accent |
| `denim` | `#2E5B89` | Accent text, focus ring, italic headline accents |
| `petrol` | `#0F4C5C` | Decorative |
| `teal` | `#176B6B` | Decorative |
| `steel` | `#4682B4` | Decorative / large text only |
| `sky` | `#A7C7E7` | Accent on dark surfaces |
| `mist` | `#DCE8F4` | Info backgrounds |
| `cream` | `#F7F3EC` | Page background, text on dark |
| `sand` | `#EDE6DA` | Secondary background, chips |
| `linen` | `#E4DACB` | Inactive tracks, skeletons |
| `paper` | `#FFFFFF` | Cards, inputs |
| `charcoal` | `#20232B` | Alternative dark text |
| `muted` | `#5E6774` | Secondary text |
| `slate` | `#727B87` | Tertiary text, icons, rules |
| `line` / `line-warm` | `#D9DDE3` / `#DDD4C6` | Hairlines |
| `coral` | `#FF6B4A` | Hero CTA, shutter, offset shadows |
| `coral-text` | `#C2410C` | Coral when it must be text (eyebrows) |
| `violet`, `lilac`, `saffron`, `blush`, `camel`, `sage` | | Maximalist editorial accents |
| `success` / `warning` / `error` | `#1E7A4C` / `#9A5B00` / `#B42318` | Status (+ `*-soft` backgrounds) |

**Refinements from the brief:** `ink` was split from `navy` (two distinct depths are needed); the
brief's `muted #727B87` measures **3.9:1** on cream — below WCAG AA for body text — so it is kept
as `slate` for icons/rules and `muted` is darkened to `#5E6774` (**5.2:1**). A unit test guards
this.

Contrast on cream: navy 13.0:1 · denim 6.4:1 · petrol 8.6:1 · teal 5.7:1 · coral-text 4.7:1 ·
success 4.8:1 · warning 4.9:1 · error 5.9:1. Steel (3.7:1) and sky are decorative only on light
backgrounds. Text placed on recommendation colours uses `readableOn(hex)`, which picks navy or
cream by contrast. Headlines over colour-driven art sit on an ink scrim so they stay readable
whatever the palette's lead colour is.

## Typography

Playfair Display (high-contrast serif) for the editorial voice; DM Sans for UI and body; DM Mono
for hex codes and numerals. Self-hosted with `next/font/google` (no requests to Google from the
visitor's browser), `display: swap`, with Georgia / system-ui / ui-monospace fallbacks.

Type utilities (`@utility type-*` in `globals.css`):

| Utility | Font | Size / line | Notes |
|---|---|---|---|
| `type-display-xl` | Playfair 900 | clamp(2.75rem → 5.5rem) / 0.98 | Landing wordmark |
| `type-display-l` | Playfair 700 | clamp(2.35rem → 3.6rem) / 1.05 | Section heroes |
| `type-h1` | Playfair 700 | clamp(1.9rem → 2.5rem) / 1.15 | Page titles |
| `type-h2` | Playfair 600 | 26px / 1.23 | Section titles |
| `type-h3` | DM Sans 700 | 18px / 1.33 | Card titles |
| `type-editorial` | Playfair italic | 22px / 1.36 | Decks and accents |
| `type-body-l` / `-m` / `-s` | DM Sans | 17 · 15 · 13px | Body copy |
| `type-label` | DM Sans 700 | 15px | Buttons, list titles |
| `type-caption` | DM Sans 500 | 12px | Metadata |
| `type-eyebrow` | DM Sans 700 | 11px | Uppercase, 0.2em tracking |
| `type-hex` | DM Mono 500 | 13px | Uppercase hex codes |
| `type-numeric` | DM Mono | 15px | Tabular numerals, section numbers |

All sizes are in `rem`, so browser text-size settings scale them; display sizes also scale with
the viewport via `clamp()`.

## Layout

- `page` utility: max width 72rem, centred, gutters 16 / 24 / 40px at phone / tablet / desktop.
- `rail-gutter`: horizontal rails bleed to the viewport edge but start at the same x as `page`
  content; items snap.
- Navigation: sticky top bar (links on ≥768px) and a bottom tab bar with a central Analyze button
  on phones; content reserves space for it, including the safe-area inset.
- Minimum touch targets are 44px (icon buttons, list rows, tabs).

## Radii, borders, shadows

- Radii: `xs 2 · sm 6 · md 12 · lg 20 · xl 28 · full`.
- **Editorial content is square** (`editorial-frame`: portrait frames, colour blocks, palette and
  outfit cards with 1.5px ink keylines); **controls are rounded** (pill buttons, 12px inputs,
  28px sheet tops).
- Shadows: `subtle`, `raised`, `floating`, and hard **offset print shadows** (`offset`,
  `offset-coral`, `offset-sky`, `offset-sm`) for layered editorial cards.
- Texture: a 256px grain PNG (`/grain.png`) multiplied over flat-lay illustrations.

## Motion

| Token | Value |
|---|---|
| Animations | `enter-up`, `enter-right`, `fade-in`, `sheet-up`, `pulse-soft`, `spin-slow`, `shape-drop`, `wordmark`, `marquee` |
| Easing | `standard` (0.2,0,0,1) · `decelerate` (0,0,0,1) · `accelerate` (0.3,0,1,1) · `editorial` (0.65,0,0.35,1) |
| JS timings (`theme/motion.ts`) | stagger 60ms · analysis stage minimum 750ms · toast 3.2s |
| Helper | `staggerStyle(index)` sets an `animation-delay` for list entrances |

Only `transform` and `opacity` animate. Under `prefers-reduced-motion: reduce`, a global rule
resolves every animation and transition to its final state and stops loops.

## Components

- `components/ui`: `Button` / `LinkButton`, `IconButton` / `IconLink`, `Badge`,
  `ProvenanceBadge`, `States` (`ErrorState`, `EmptyState`, `LoadingState`, `Skeleton`),
  `InlineAlert`, `Checkbox`, `SegmentedControl`, `Tabs`, `FormField`, `Sheet` (native `<dialog>`),
  `ConfirmDialog`, `toast` + `Toaster`, `ListRow` / `ListGroup`, `Avatar`, `Rail` / `RailItem`,
  `Spinner`.
- `components/layout`: `AppProviders`, `AppNav`, `AppGate`, `PageHeader` / `SectionHeader`,
  `OfflineBanner`, `LandingAccountLink`.
- `components/brand`: `Logo` / `ColorWheelMark`, `Blob`, `SplashShapes`, `EditorialArt`
  (`SwatchFan`, `DrapePanels`, `PaletteStack`).
- `components/colors`: `ColorSwatch`, `ColorPaletteCard`, `PaletteStrip`, `CombinationCard`,
  `ColorDetailSheet`.
- `components/outfits`: `GarmentIllustration` (shirt, tee, knit, jacket, coat, trousers, jeans,
  skirt, dress, shoes, accessory), `OutfitFlatLay`, `DrapePreview`, `PortraitFrame`,
  `OutfitCard`, `SavedOutfitCard`.
- `components/shop`: `ShopLinks` (section and compact variants, audience switch, disclosure),
  `ShopSettings`, `ShopLinkCheck`.
- `components/camera`: `FaceGuideOverlay`, `CameraTips`, `ImageQualityNotice`.
  `components/analysis`: `AnalysisProgress`, `CharacteristicScale`, `AnalysisHistoryItem`,
  `LatestStoryCard`.

## Accessibility conventions

- Semantic HTML first: real `<button>`/`<a>`, native checkboxes and radios, `<dialog>` for
  sheets, `<dl>` for stats, landmarks (`header`, `nav`, `main`) and a skip link.
- Every icon-only control has an accessible name; toggles expose `aria-pressed`; segmented
  controls are radio groups and tab sets are WAI-ARIA tabs (arrow-key navigation).
- Errors are `role="alert"`; loading regions are polite `role="status"`; progress is a real
  `progressbar`/`meter` with values.
- One consistent `:focus-visible` ring (2.5px denim).
- Provenance badges carry a full explanation for screen readers and as a tooltip.
- Decorative art (blobs, splash shapes, illustrations inside labelled cards) is `aria-hidden`.
