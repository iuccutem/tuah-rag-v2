import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  rows: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).nullable().optional(),
        question: z.string().nullable().optional(),
        web: z.string().nullable().optional(),
        telegram_whatsapp: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(500),
});

const RowOutput = z.object({
  intent: z.string(),
  answer: z.string(),
  metadata: z.string(),
});

export type RagExportRow = {
  lang: "en";
  intent: string;
  question: string;
  answer: string;
  metadata: string;
  url: string | null;
};

const URL_RE = /(https?:\/\/[^\s<>()\[\]]+)/i;
function extractUrl(text: string): string | null {
  const m = text.match(URL_RE);
  if (!m) return null;
  return m[1].replace(/[.,;:!?)\]]+$/, "");
}

async function formatOne(
  model: ReturnType<ReturnType<typeof createLovableAiGatewayProvider>>,
  row: { question?: string | null; web?: string | null; telegram_whatsapp?: string | null },
): Promise<{ intent: string; answer: string; metadata: string }> {
  const question = (row.question ?? "").trim();
  const webText = (row.web ?? "").trim();
  const tgText = (row.telegram_whatsapp ?? "").trim();

  const prompt = `You are formatting Q&A entries for a RAG knowledge base.

Given a question and up to two candidate answers from different channels (Web and Telegram/WhatsApp), produce:

1. "answer": the single best answer in English. Pick the more complete/cleaner of the two candidates, or merge them if both add value. Preserve any URLs inline. Strip channel-specific noise (greetings, signatures, "Click here" boilerplate). Keep it factual and readable.
2. "intent": a short dotted slug describing the question's intent, like "staff.director", "accommodation.count", "admissions.office". Lowercase, 2-3 dot-separated segments, snake_case if needed within a segment.
3. "metadata": 2-4 short topical tags joined with "; " (semicolon + space). Example: "education; university_administration; UTeM ACCESS".

QUESTION:
${question}

WEB ANSWER:
${webText || "(none)"}

TELEGRAM/WHATSAPP ANSWER:
${tgText || "(none)"}`;

  const { experimental_output } = await generateText({
    model,
    experimental_output: Output.object({ schema: RowOutput }),
    prompt,
  });
  return experimental_output;
}

export const exportRowsAsRag = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<{ rows: RagExportRow[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const out: RagExportRow[] = [];
    const batchSize = 4;
    for (let i = 0; i < data.rows.length; i += batchSize) {
      const batch = data.rows.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (row) => {
          try {
            const r = await formatOne(model, row);
            const answer = r.answer.trim();
            return {
              lang: "en" as const,
              intent: r.intent.trim(),
              question: (row.question ?? "").trim(),
              answer,
              metadata: r.metadata.trim(),
              url: extractUrl(answer),
            };
          } catch (e) {
            const question = (row.question ?? "").trim();
            const fallback = ((row.web ?? row.telegram_whatsapp) ?? "").trim();
            return {
              lang: "en" as const,
              intent: "",
              question,
              answer: fallback,
              metadata: "",
              url: extractUrl(fallback),
            };
          }
        }),
      );
      out.push(...results);
    }
    return { rows: out };
  });
