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
        url: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(500),
});

const RowOutput = z.object({
  intent: z.string(),
  question: z.string(),
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

function cleanUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return v.length > 0 ? v : null;
}

async function formatOne(
  model: ReturnType<ReturnType<typeof createLovableAiGatewayProvider>>,
  row: { question?: string | null; web?: string | null; telegram_whatsapp?: string | null },
): Promise<{ intent: string; question: string; answer: string; metadata: string }> {
  const question = (row.question ?? "").trim();
  const expected = (row.telegram_whatsapp ?? "").trim();

  const prompt = `You are formatting Q&A entries for a RAG knowledge base.

Given a QUESTION and an EXPECTED ANSWER, produce four fields. The Expected Answer is the sole source of truth for the answer — do not invent facts, do not merge in outside information.

OUTPUT FIELDS:
1. "question": the original question, translated to natural English if it is in Malay or mixed Malay/English. If already in English, keep as-is (light cleanup only). Preserve proper nouns and acronyms (UTeM, FTKEK, FAIX, ACCESS, etc.) unchanged.
2. "answer": the Expected Answer, translated to natural English if it is Malay / mixed. Strip channel-specific noise (greetings, signatures, "Click here" boilerplate, emojis) but keep all facts complete. Preserve URLs and email addresses inline exactly as written. Do not add facts that are not in the Expected Answer.
3. "intent": a short dotted slug describing the question's intent, like "staff.director", "accommodation.count", "admissions.office". Lowercase, 2-3 dot-separated segments, snake_case if needed within a segment.
4. "metadata": 2-4 short topical tags joined with "; " (semicolon + space). Example: "education; university_administration; UTeM ACCESS".

TRANSLATION RULES:
- Translate Malay → English naturally; do not transliterate.
- Keep proper nouns, acronyms, course codes, programme names, URLs, and email addresses unchanged.
- If text is already English, do not paraphrase aggressively — keep the user's wording.

QUESTION:
${question}

EXPECTED ANSWER:
${expected || "(none)"}`;

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
              question: (r.question || row.question || "").trim(),
              answer,
              metadata: r.metadata.trim(),
              url: cleanUrl(row.url),
            };
          } catch (e) {
            const question = (row.question ?? "").trim();
            const fallback = (row.telegram_whatsapp ?? "").trim();
            return {
              lang: "en" as const,
              intent: "",
              question,
              answer: fallback,
              metadata: "",
              url: cleanUrl(row.url),
            };
          }
        }),
      );
      out.push(...results);
    }
    return { rows: out };
  });
