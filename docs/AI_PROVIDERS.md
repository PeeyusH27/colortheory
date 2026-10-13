# AI providers: analysis, image editing and virtual try-on

Researched and checked against official docs, model pages or live APIs on **2026-10-13**.
Pricing, quotas and model availability change often — re-check before launch. Items that could
not be confirmed are marked *unverified*.

## Three different capabilities (not interchangeable)

| Capability | What it does | Fit for ColorTheory |
|---|---|---|
| **Image generation** | Creates a new image from text | ✗ Would invent a person — never used |
| **Image editing** | Changes an existing photo from an instruction ("make the top navy") | ~ Works without a garment photo; identity preservation varies |
| **Virtual try-on** | Puts a *specific garment image* onto a *specific person image* | ✓ The right tool when you have a garment photo per colour |

The site never needs generative AI to show recommendations: the palette and outfit engines are
deterministic, and Mode A (colour drape) uses the user's unmodified photo.

## What the site ships with

| Job | Default | Optional real provider | Where the key lives |
|---|---|---|---|
| Colour analysis | **In-browser** heuristic (private, offline, free) | `analyze-portrait` → **Claude** `claude-opus-5-5` vision with JSON-schema output | Edge Function secret `ANTHROPIC_API_KEY` |
| Outfit previews | **Mock** provider (walks the real job states, produces no image, labelled Demo) | `generate-outfit` → **FASHN** `tryon-v1.6` (or `edit` when no garment photo exists) | Edge Function secret `FASHN_API_KEY` |

Both providers sit behind interfaces (`ColorAnalysisProvider`, `OutfitGenerationProvider`) and
Edge Functions, so swapping vendors touches one function, not the website.

### Cloud analysis with Claude

- Model `claude-opus-5-5` (override with `ANALYSIS_MODEL`), effort `low` (`ANALYSIS_EFFORT`) —
  a bounded perception task.
- `output_config.format` JSON schema → typed numbers/arrays; ranges are re-validated with Zod in
  the function and again in the browser.
- Server-side refusal fallback enabled (`fallbacks: "default"`, beta
  `server-side-fallback-2026-07-01`). A refusal or unusable photo becomes a quality-gate message,
  never a made-up result.
- The prompt restricts output to visible colour and forbids inferences about ethnicity, age,
  gender, health or attractiveness.
- The portrait is sent as base64 from the server; no URL to it is ever exposed. Check Anthropic's
  current API data-retention terms for your organisation before launch.

## Try-on provider comparison

| | **FASHN API** (selected) | **Replicate** | **Hugging Face** | **fal.ai** | **Google Vertex AI** |
|---|---|---|---|---|---|
| Docs | [docs.fashn.ai](https://docs.fashn.ai/) | [HTTP API](https://replicate.com/docs/reference/http), [cuuupid/idm-vton](https://replicate.com/cuuupid/idm-vton) | [ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu), [Inference pricing](https://huggingface.co/docs/inference-providers/pricing) | [Try-on catalog](https://fal.ai/explore/virtual-try-on-apis), [Queue API](https://fal.ai/docs/model-apis/model-endpoints/queue) | [Virtual try-on guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/generate-virtual-try-on-images) |
| Model / endpoint | `tryon-v1.6` (stable), `tryon-max` (preview), `edit` (experimental) | `cuuupid/idm-vton` (version `0513734a…e985`); OOTDiffusion variants | Spaces: IDM-VTON, OOTDiffusion, Leffa, FASHN VTON 1.5, Kolors (CatVTON Space was down) | `fal-ai/fashn/tryon/v1.6`, `fal-ai/leffa/virtual-tryon`, `bria/fibo-edit-1.5/virtual-try-on`, `fal-ai/image-apps-v2/virtual-try-on` | `virtual-try-on-001` (GA 2026-01-20, discontinuation 2027-01-20) |
| Type | True try-on (+ instruction edit) | True try-on | Try-on demos; Inference Providers image-to-image is editing only | True try-on (several models) | True try-on |
| Identity preservation | `tryon-max`: "preserves the model's identity, pose, and styling"; v1.6: body shape/skin texture preservation | No explicit claim | Model-dependent | Bria claims identity/face/hair preserved; others no claim | No explicit claim |
| Free tier / trial | **None for the API** — credits must be purchased before creating a key (min $7.50 = 100 credits); 10 free credits are web-app only | "Select models free for a bit", then billing (card requirement *unverified*) | ZeroGPU: 5 GPU-min/day (free account), 40 (PRO) | Promotional credits only (card requirement *unverified*) | $300 GCP trial; **card required** |
| Rate limits | run 50/60 s, status 50/10 s, 6 concurrent | 600 creates/min | Per-account GPU quota | Concurrency 2 → 40 with spend | 50 req/min/model/region |
| Image limits | v1.6 works at 864×1296; URL or data URI | Person image 3:4 (or `crop: true`); data URIs < 1 MB recommended | Space-specific | Model-specific | ≤10 MB, PNG/JPEG |
| Commercial use | **Yes** — you own outputs | **IDM-VTON is CC BY-NC-SA 4.0 (non-commercial)** | IDM-VTON, OOTDiffusion, CatVTON non-commercial; Leffa MIT; FASHN VTON 1.5 Apache-2.0 but its human parser is research-only | Per model (FASHN, Leffa commercial; CatVTON non-commercial) | Yes (outputs carry SynthID/C2PA) |
| Privacy / retention | Output CDN links deleted after 3 days; base64 outputs 60 min; URL inputs keep only the URL; **no training on customer content** | API inputs/outputs/logs deleted after 1 hour | Public Spaces, no SLA, retention unclear | Media public by default, ≥7 days; request JSON 30 days (opt out with `X-Fal-Store-IO: 0`) | No training without permission; abuse logging may apply |
| Setup | Low (Bearer key, 2 endpoints) | Low | Medium (Gradio SSE, flaky) | Low | High (GCP project, OAuth service account) |
| Price / image | $0.075 on demand (1 credit) | ~$0.024 | Free within quota | $0.04–$0.10 | $0.06 |

**Why FASHN:** it actually performs garment try-on, permits commercial use, has the clearest
retention policy (no training, 3-day output deletion), and a two-endpoint HTTP API that is easy
to call from Deno with job polling. The trade-off: there's no free API tier.

**Alternatives:** fal.ai if you want one key for several try-on and editing models (watch its
public-by-default media and set `X-Fal-Store-IO: 0`); Replicate IDM-VTON for **non-commercial**
prototypes only; Hugging Face Spaces for experiments only; Vertex AI if you're already on GCP.

**Run your own:** CatVTON (< 8 GB VRAM, non-commercial), IDM-VTON (~16–24 GB, non-commercial),
Leffa (MIT; training data is research datasets — get legal review), FASHN VTON 1.5 (Apache-2.0,
research-only parser). These need a GPU host; they can't run inside an Edge Function.

### Image editors (if you prefer prompt-based recolouring)

Available on Replicate (prices from model pages): `google/nano-banana-2.1` ($0.0336 at 1K),
`black-forest-labs/flux-kontext-pro` ($0.04, commercial use), `qwen/qwen-image-edit-2511`
($0.03), `bytedance/seedream-4.5` ($0.04). Note that Google shut down
`gemini-2.5-flash-image` on 2026-10-02.

## FASHN contract used by `generate-outfit`

```http
POST https://api.fashn.ai/v1/run
Authorization: Bearer $FASHN_API_KEY

{ "model_name": "tryon-v1.6",
  "inputs": { "model_image": "<5-min signed URL>", "garment_image": "<signed URL>",
              "category": "tops|bottoms|one-pieces", "garment_photo_type": "flat-lay",
              "mode": "balanced", "segmentation_free": true, "moderation_level": "permissive",
              "num_samples": 1, "output_format": "png", "return_base64": false } }
→ { "id": "…", "error": null }

GET https://api.fashn.ai/v1/status/{id}
→ { "status": "starting|in_queue|processing|completed|failed", "output": ["https://cdn.fashn.ai/…"], "error": {…} }
```

- API errors: `400 BadRequest`, `401 UnauthorizedAccess`, `404 NotFound`,
  `429 RateLimitExceeded | ConcurrencyLimitExceeded | OutOfCredits`, `500 InternalServerError`.
- Runtime failures arrive as `status: "failed"` with `ImageLoadError`, `ContentModerationError`,
  `InputValidationError`, `PoseError` and others, mapped to friendly copy. Failed jobs aren't
  billed.
- The function only downloads outputs from `cdn.fashn.ai` (SSRF guard) and copies them into the
  private `outfit-previews` bucket straight away.

### Garment images

True try-on needs a garment photo in each colour. Upload licensed or original flat-lays to the
private `garment-references` bucket as `{template_id}/{color_id}.png` (e.g.
`clean-shirt/navy.png`). Without one, the function falls back to FASHN `edit` with a prompt that
asks to change only the garment and keep face, hair, skin, pose, background and lighting. Set
`TRYON_MODE=edit` to always use `edit`.

### Cost controls

- `AI_PREVIEW_DAILY_LIMIT` (default 5) and `ANALYSIS_DAILY_LIMIT` (default 10) per user per
  rolling 24 h, enforced server-side.
- `AI_PREVIEWS_ENABLED=false` turns AI previews off instantly.
- Previews are only generated on an explicit click or tap — never prefetched.
- Jobs stuck for more than 10 minutes are failed; `cleanup-orphans` fails anything older than an
  hour.
- Check balance: `GET https://api.fashn.ai/v1/credits`.

## Honesty rules the UI enforces

- Demo/mock output is always badged "Demo · sample data" and never shown as a generated image.
- Drapes are badged "Colour drape · not AI".
- AI previews are badged "AI preview · approximation" with a note that faces and fit may not be
  reproduced exactly; the original portrait is never modified.
- Analysis results show provenance (on-device / cloud / demo), a confidence label and photo
  quality warnings, and can be adjusted by the user.
