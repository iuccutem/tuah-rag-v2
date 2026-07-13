const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/498f1285-dd47-489f-bf00-17487742d2c6";

export const method = "POST" as const;

export const handler = async ({ request }: { request: Request }): Promise<Response> => {
        const user = process.env.N8N_WEBHOOK_USER;
        const password = process.env.N8N_WEBHOOK_PASSWORD;
        if (!user || !password) {
          return Response.json(
            { ok: false, error: "Webhook credentials are not configured." },
            { status: 200 },
          );
        }

        let body: { name?: string } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
        }
        const name = (body.name ?? "").trim();
        if (!name || !/^qatest-[a-z0-9-]+$/.test(name)) {
          return Response.json({ ok: false, error: "Invalid table name." }, { status: 400 });
        }

        const auth = Buffer.from(`${user}:${password}`).toString("base64");
        try {
          const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ name }),
          });
          const text = await res.text();
          if (!res.ok) {
            return Response.json(
              { ok: false, error: `Webhook ${res.status}: ${text.slice(0, 200) || res.statusText}` },
              { status: 200 },
            );
          }
          return Response.json({ ok: true, data: text }, { status: 200 });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : "Failed to reach webhook." },
            { status: 200 },
          );
        }
      };
