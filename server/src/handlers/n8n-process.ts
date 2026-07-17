// Trigger the agent to process rows for a given channel.
const WEBHOOK_URLS = {
  web: "https://tuah.utem.edu.my/agent/webhook/ad7bc9b8-0b89-4e4a-bdb5-89b83ecddc59",
  telegram_whatsapp:
    "https://tuah.utem.edu.my/agent/webhook/ad7bc9b8-0b89-4e4a-bdb5-89b83ecddc59",
} as const;

type Channel = keyof typeof WEBHOOK_URLS;

export const method = "POST" as const;

export const handler = async ({ request }: { request: Request }): Promise<Response> => {
        let channel: Channel = "web";
        let question = "";
        let table = "";
        let vectorId = "";
        let systemPromptId = "";
        let systemPrompt = "";
        let systemPromptName = "";
        let model = "";
        try {
          const body = (await request.json()) as {
            channel?: string;
            question?: string;
            table?: string;
            vector_id?: string;
            system_prompt_id?: string;
            system_prompt?: string;
            system_prompt_name?: string;
            model?: string;
          };
          if (body.channel === "telegram_whatsapp" || body.channel === "web") {
            channel = body.channel;
          }
          if (typeof body.question === "string") question = body.question.trim();
          if (typeof body.table === "string") table = body.table.trim();
          if (typeof body.vector_id === "string") vectorId = body.vector_id.trim();
          if (typeof body.system_prompt_id === "string") systemPromptId = body.system_prompt_id.trim();
          if (typeof body.system_prompt === "string") systemPrompt = body.system_prompt;
          if (typeof body.system_prompt_name === "string") systemPromptName = body.system_prompt_name.trim();
          if (typeof body.model === "string") model = body.model.trim();
        } catch {
          // default to web, no question
        }
        const WEBHOOK_URL = WEBHOOK_URLS[channel];
        const user = process.env.N8N_WEBHOOK_USER;
        const password = process.env.N8N_WEBHOOK_PASSWORD;
        if (!user || !password) {
          return Response.json(
            { ok: false, error: "Webhook credentials are not configured." },
            { status: 200 },
          );
        }

        const auth = Buffer.from(`${user}:${password}`).toString("base64");
        try {
          const upstream: Record<string, unknown> = {};
          if (question) upstream.question = question;
          if (table) upstream.table = table;
          if (vectorId) upstream.vector_id = vectorId;
          if (systemPromptId) upstream.system_prompt_id = systemPromptId;
          if (systemPrompt) upstream.system_prompt = systemPrompt;
          if (systemPromptName) upstream.system_prompt_name = systemPromptName;
          if (model) upstream.model = model;
          const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(upstream),
          });

          const text = await res.text();
          let data: unknown = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = text;
          }
          if (!res.ok) {
            return Response.json(
              { ok: false, error: `Webhook returned ${res.status}`, data },
              { status: 200 },
            );
          }
          return Response.json({ ok: true, data }, { status: 200 });
        } catch (error) {
          return Response.json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to reach webhook.",
            },
            { status: 200 },
          );
        }
      };
