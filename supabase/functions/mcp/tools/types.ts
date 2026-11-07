import type { SupabaseContext } from "npm:@supabase/server@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.108.2";

export type ToolContext = {
  supabase: SupabaseClient;
  userClaims: NonNullable<SupabaseContext["userClaims"]>;
  jwtClaims: NonNullable<SupabaseContext["jwtClaims"]>;
};
