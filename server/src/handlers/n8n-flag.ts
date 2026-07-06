const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/adf82095-c24f-4a8f-9e10-fca39d0452ff";

type Field = "question" | "url" | "web" | "telegram_whatsapp" | null;

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

        let body: {
          id?: string | number | null;
          table?: string;
          field?: Field;
          question?: string | null;
          url?: string | null;
          web?: string | null;
          telegram_whatsapp?: string | null;
          question_error?: boolean;
          question_highlight?: boolean;
          telegram_whatsapp_error?: boolean;
          telegram_whatsapp_highlight?: boolean;
          web_error?: boolean;
          web_highlight?: boolean;
        };
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON body." },
            { status: 400 },
          );
        }

        if (body?.id == null || body.id === "") {
          return Response.json(
            { ok: false, error: "Missing row id." },
            { status: 400 },
          );
        }

        const str = (v: unknown) => (typeof v === "string" ? v : "");
        const bool = (v: unknown) => v === true;
        const allowedFields: Field[] = [
          "question",
          "url",
          "web",
          "telegram_whatsapp",
        ];
        const field: Field =
          body.field && allowedFields.includes(body.field) ? body.field : null;

        const payload: Record<string, unknown> = {
          id: body.id,
          field,
          question: str(body.question),
          url: str(body.url),
          web: str(body.web),
          telegram_whatsapp: str(body.telegram_whatsapp),
          question_error: bool(body.question_error),
          question_highlight: bool(body.question_highlight),
          telegram_whatsapp_error: bool(body.telegram_whatsapp_error),
          telegram_whatsapp_highlight: bool(body.telegram_whatsapp_highlight),
          web_error: bool(body.web_error),
          web_highlight: bool(body.web_highlight),
        };
        if (typeof body.table === "string" && body.table.trim()) {
          payload.table = body.table.trim();
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
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            return Response.json(
              { ok: false, error: `Webhook ${res.status}: ${text || res.statusText}` },
              { status: 200 },
            );
          }
          return Response.json({ ok: true });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : "Failed to reach webhook." },
            { status: 200 },
          );
        }
      };
