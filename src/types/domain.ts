/**
 * Domain types shared by services, stores and screens. Database row types live in
 * `types/database.ts`; mapping between the two happens in the repositories.
 */

export type GarmentCategory =
  | 'shirt'
  | 'tee'
  | 'knit'
  | 'jacket'
  | 'coat'
  | 'trousers'
  | 'jeans'
  | 'skirt'
  | 'dress'
  | 'shoes'
  | 'accessory';

export type ColorRole = 'core' | 'neutral' | 'accent' | 'experimental';

/** A colour recommendation with the reasoning shown to the user. */
export interface ColorRecommendation {
  id: string;
  name: string;
  hex: string;
  role: ColorRole;
  /** Garments this colour works best in (near the face vs. away from it). */
  garments: GarmentCategory[];
  reason: string;
  /** Hexes from the same result that pair well with this colour. */
  pairings: string[];
}

export interface ColorCombination {
  id: string;
  name: string;
  hexes: string[];
  note: string;
}

export type UndertoneLean = 'cool' | 'neutral-cool' | 'neutral' | 'neutral-warm' | 'warm';
export type DepthEstimate = 'light' | 'light-medium' | 'medium' | 'medium-deep' | 'deep';
export type ContrastEstimate = 'low' | 'medium' | 'high';
export type ChromaEstimate = 'soft' | 'balanced' | 'clear';

/** Visible characteristics estimated from the photo. Always estimates, never diagnoses. */
export interface VisibleCharacteristics {
  undertone: { estimate: UndertoneLean; /** -1 cool … +1 warm */ lean: number };
  depth: { estimate: DepthEstimate; /** 0 light … 1 deep */ value: number };
  contrast: { estimate: ContrastEstimate; value: number };
  chroma: { estimate: ChromaEstimate; value: number };
  /** Average colour of the sampled skin region, for transparency in the UI. */
  sampledHex: string | null;
}

export type QualityIssueCode =
  | 'too_dark'
  | 'overexposed'
  | 'low_contrast'
  | 'color_cast_warm'
  | 'color_cast_cool'
  | 'color_cast_green'
  | 'color_cast_magenta'
  | 'blurry'
  | 'low_resolution'
  | 'face_region_unclear';

export interface QualityIssue {
  code: QualityIssueCode;
  severity: 'info' | 'warning' | 'blocking';
  message: string;
}

export interface ImageQualityReport {
  /** 0 (unusable) … 1 (ideal). */
  score: number;
  issues: QualityIssue[];
  metrics: {
    meanLuminance: number;
    clippedHighlights: number;
    crushedShadows: number;
    /** Gray-world channel deviation; >0 means the image leans warm. */
    warmCast: number;
    greenMagentaCast: number;
    sharpness: number;
    width: number;
    height: number;
  };
}

export type AnalysisProviderId = 'mock' | 'on-device' | 'remote';

/** User feedback that nudges the palette ("this feels too cool for me"). */
export interface AnalysisAdjustments {
  warmth: number; // -1 … +1
  depth: number; // -1 … +1
}

export interface ColorAnalysisResult {
  schemaVersion: 1;
  provider: AnalysisProviderId;
  /** True for sample output that is not derived from the user's photo. */
  isDemo: boolean;
  title: string;
  headline: string;
  explanation: string;
  styleStatement: string;
  characteristics: VisibleCharacteristics;
  /** 0–1, or null when the provider cannot estimate it. */
  confidence: number | null;
  quality: ImageQualityReport | null;
  qualityWarnings: string[];
  recommendedColors: ColorRecommendation[];
  neutralColors: ColorRecommendation[];
  experimentalColors: ColorRecommendation[];
  combinations: ColorCombination[];
  adjustments: AnalysisAdjustments;
  createdAt: string;
}

export type AnalysisStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type PortraitStorageLocation = 'device' | 'cloud' | 'deleted';

export interface AnalysisSession {
  id: string;
  createdAt: string;
  status: AnalysisStatus;
  provider: AnalysisProviderId;
  portrait: {
    location: PortraitStorageLocation;
    /** file:// URI when stored on the device. */
    localUri: string | null;
    /** Private storage object path when uploaded (never shown to users). */
    storagePath: string | null;
  };
  result: ColorAnalysisResult | null;
}

export interface PaletteColor {
  name: string;
  hex: string;
}

export interface SavedPalette {
  id: string;
  analysisId: string | null;
  name: string;
  kind: 'analysis' | 'custom';
  colors: PaletteColor[];
  isFavorite: boolean;
  createdAt: string;
}

export interface FavoriteColor {
  id: string;
  name: string;
  hex: string;
  analysisId: string | null;
  createdAt: string;
}

export type PreviewMode = 'drape' | 'ai';
export type GenerationStatus = 'not_requested' | 'queued' | 'processing' | 'completed' | 'failed';

export interface OutfitPreview {
  id: string;
  analysisId: string | null;
  outfitId: string;
  outfitName: string;
  garmentHex: string;
  mode: PreviewMode;
  provider: string;
  generationStatus: GenerationStatus;
  /** Local file URI or private storage path of a generated image. */
  imageUri: string | null;
  imagePath: string | null;
  isDemo: boolean;
  createdAt: string;
}

export interface SavedOutfit {
  id: string;
  preview: OutfitPreview;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUri: string | null;
}

export interface CollectionStats {
  analyses: number;
  palettes: number;
  favoriteColors: number;
  savedOutfits: number;
  cloudPortraits: number;
}
