import type { Deal } from "../types";

/**
 * The whole deal is stored as jsonb so the calculation input can keep evolving
 * without a migration; `lib/defaults.ts#normalizeInput` handles older shapes.
 */
export type DealRow = {
  id: string;
  user_id: string;
  data: Deal;
  created_at: string;
  updated_at: string;
};

export type UserSettingsRow = {
  user_id: string;
  affordability: Record<string, unknown>;
  updated_at: string;
};

/** Hand-written to mirror the shape of `supabase gen types typescript`. */
export type Database = {
  public: {
    Tables: {
      deals: {
        Row: DealRow;
        Insert: Omit<DealRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<DealRow>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettingsRow;
        Insert: Omit<UserSettingsRow, "updated_at"> & {
          updated_at?: string;
        };
        Update: Partial<UserSettingsRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
