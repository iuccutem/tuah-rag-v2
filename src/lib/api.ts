// Client helper that routes /api/<name> calls to Supabase Edge Functions.
// Same call sites work in Lovable preview and in the university deploy.
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  // Accept both "/api/foo" and "foo".
  const name = path.replace(/^\/?api\//, "").replace(/^\//, "");
  const [fnName, query = ""] = name.split("?");
  const url = `${SUPABASE_URL}/functions/v1/${fnName}${query ? `?${query}` : ""}`;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("apikey", SUPABASE_ANON_KEY);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...init, headers });
}
