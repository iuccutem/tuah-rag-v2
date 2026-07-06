import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const RegisterInput = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

export const method = "POST" as const;

export const handler = async ({ request }: { request: Request }): Promise<Response> => {
  const raw = await request.json().catch(() => ({}));
  const parsed = RegisterInput.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json(
      { error: "Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json({ userId: data.user?.id ?? null });
};
