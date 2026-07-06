// Mints a short-lived HS256 JWT for n8n webhooks that require JWT auth.
function base64UrlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else bytes = new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signN8nJwt(
  extraPayload: Record<string, unknown> = {},
): Promise<string> {
  const secret = Deno.env.get("N8N_JWT_SECRET");
  if (!secret) throw new Error("N8N_JWT_SECRET is not configured");

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now, exp: now + 300, ...extraPayload };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export function basicAuthHeader(): string | null {
  const user = Deno.env.get("N8N_WEBHOOK_USER");
  const password = Deno.env.get("N8N_WEBHOOK_PASSWORD");
  if (!user || !password) return null;
  return `Basic ${btoa(`${user}:${password}`)}`;
}
