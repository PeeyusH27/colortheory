/**
 * Supabase database types for the schema in `supabase/migrations`.
 *
 * Hand-written to match the migrations. After changing the schema you can regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.generated.ts
 * and compare.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type AnalysisStatusDb = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PortraitLocationDb = 'device' | 'cloud' | 'deleted';
export type ModelProviderDb = 'mock' | 'on-device' | 'remote';
export type GenerationStatusDb = 'not_requested' | 'queued' | 'processing' | 'completed' | 'failed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; avatar_path: string | null } & Timestamps;
        Insert: { id: string; display_name?: string | null; avatar_path?: string | null };
        Update: { display_name?: string | null; avatar_path?: string | null };
        Relationships: [];
      };
      analysis_sessions: {
        Row: {
          id: string;
          user_id: string;
          original_image_path: string | null;
          portrait_location: PortraitLocationDb;
          status: AnalysisStatusDb;
          analysis_result: Json | null;
          model_provider: ModelProviderDb;
          is_demo: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id?: string;
          original_image_path?: string | null;
          portrait_location?: PortraitLocationDb;
          status?: AnalysisStatusDb;
          analysis_result?: Json | null;
          model_provider: ModelProviderDb;
          is_demo?: boolean;
        };
        Update: {
          original_image_path?: string | null;
          portrait_location?: PortraitLocationDb;
          status?: AnalysisStatusDb;
          analysis_result?: Json | null;
        };
        Relationships: [];
      };
      color_palettes: {
        Row: {
          id: string;
          user_id: string;
          analysis_id: string | null;
          name: string;
          kind: 'analysis' | 'custom';
          colors: Json;
          is_favorite: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id?: string;
          analysis_id?: string | null;
          name: string;
          kind?: 'analysis' | 'custom';
          colors: Json;
          is_favorite?: boolean;
        };
        Update: { name?: string; colors?: Json; is_favorite?: boolean };
        Relationships: [];
      };
      favorite_colors: {
        Row: { id: string; user_id: string; analysis_id: string | null; name: string; hex: string; created_at: string };
        Insert: { id?: string; user_id?: string; analysis_id?: string | null; name: string; hex: string };
        Update: { name?: string };
        Relationships: [];
      };
      outfit_previews: {
        Row: {
          id: string;
          user_id: string;
          analysis_id: string | null;
          outfit_id: string;
          outfit_name: string;
          garment_color: string;
          mode: 'drape' | 'ai';
          image_path: string | null;
          provider: string;
          provider_job_id: string | null;
          generation_status: GenerationStatusDb;
          error_code: string | null;
          is_demo: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id?: string;
          analysis_id?: string | null;
          outfit_id: string;
          outfit_name: string;
          garment_color: string;
          mode?: 'drape' | 'ai';
          image_path?: string | null;
          provider: string;
          provider_job_id?: string | null;
          generation_status?: GenerationStatusDb;
          error_code?: string | null;
          is_demo?: boolean;
        };
        Update: {
          generation_status?: GenerationStatusDb;
          image_path?: string | null;
          error_code?: string | null;
        };
        Relationships: [];
      };
      saved_outfits: {
        Row: { id: string; user_id: string; outfit_preview_id: string; created_at: string };
        Insert: { id?: string; user_id?: string; outfit_preview_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
