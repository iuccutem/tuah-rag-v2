import "dotenv/config";
import express, { type Request as ExRequest, type Response as ExResponse } from "express";
import cors from "cors";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HANDLERS_DIR = join(__dirname, "handlers");

type HandlerModule = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  handler: (args: { request: Request }) => Promise<Response>;
};

async function loadHandlers() {
  const files = readdirSync(HANDLERS_DIR).filter((f) => /\.(m?[jt]s)$/.test(f));
  const routes: Array<{ path: string; method: string; handler: HandlerModule["handler"] }> = [];
  for (const file of files) {
    const mod = (await import(pathToFileURL(join(HANDLERS_DIR, file)).href)) as HandlerModule;
    if (!mod.handler || !mod.method) continue;
    const name = file.replace(/\.(m?[jt]s)$/, "");
    routes.push({ path: `/api/${name}`, method: mod.method, handler: mod.handler });
  }
  return routes;
}

function toFetchRequest(req: ExRequest): Request {
  const protocol = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
  const host = req.headers.host ?? "localhost";
  const url = `${protocol}://${host}${req.originalUrl}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv));
    else if (typeof v === "string") headers.set(k, v);
  }

  const method = req.method.toUpperCase();
  const init: RequestInit = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    // Express with express.json() gives us req.body as parsed JSON when
    // Content-Type is application/json. Handlers below all call request.json()
    // so re-serialize; for other content types fall back to raw string.
    if (req.body === undefined || (typeof req.body === "object" && req.body !== null && Object.keys(req.body).length === 0 && !(req.body instanceof Buffer))) {
      // No body
    } else if (Buffer.isBuffer(req.body)) {
      init.body = req.body;
    } else if (typeof req.body === "string") {
      init.body = req.body;
    } else {
      init.body = JSON.stringify(req.body);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }
  }

  return new Request(url, init);
}

async function sendFetchResponse(res: ExResponse, response: Response) {
  res.status(response.status);
  response.headers.forEach((v, k) => {
    // Skip hop-by-hop headers Express will manage.
    if (k.toLowerCase() === "content-length") return;
    res.setHeader(k, v);
  });
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  const routes = await loadHandlers();
  for (const r of routes) {
    console.log(`[server] ${r.method.padEnd(6)} ${r.path}`);
    (app as any)[r.method.toLowerCase()](r.path, async (req: ExRequest, res: ExResponse) => {
      try {
        const fetchReq = toFetchRequest(req);
        const response = await r.handler({ request: fetchReq });
        await sendFetchResponse(res, response);
      } catch (err) {
        console.error(`[${r.path}] error:`, err);
        res.status(500).json({
          error: err instanceof Error ? err.message : "Internal server error",
        });
      }
    });
  }

  const port = Number(process.env.PORT ?? 6699);
  app.listen(port, () => {
    console.log(`[server] listening on http://127.0.0.1:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
