import { corsHeaders, json } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const raw = await req.json().catch(() => ({})) as { email?: string; password?: string };
  const email = (raw.email ?? "").trim();
  const password = raw.password ?? "";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return json({ error: "Invalid email." }, { status: 400 });
  if (password.length < 6 || password.length > 128)
    return json({ error: "Password must be 6-128 chars." }, { status: 400 });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey)
    return json({ error: "Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) return json({ error: error.message }, { status: 400 });
  return json({ userId: data.user?.id ?? null });
});
