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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
