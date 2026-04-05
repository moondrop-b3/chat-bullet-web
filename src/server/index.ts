import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import commentsRouter from "./routes/comments";
import { registerWebSocket } from "./ws/handler";
import { sessionFile } from "./store";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

app.use(express.json({ limit: "20kb" }));
app.use("/api/comments", commentsRouter);
registerWebSocket(wss);

// ── クライアント配信（開発: Vite / 本番: 静的ファイル） ───────────────

const isDev = process.env.NODE_ENV !== "production";
const clientRoot = join(process.cwd(), "src/client");
const indexHtmlPath = join(clientRoot, "index.html");
const clientDistPaths = [
  join(process.cwd(), "dist/client"),
  join(process.cwd(), "src/client"),
];
const staticRoot =
  clientDistPaths.find((candidate) => existsSync(candidate)) ??
  join(process.cwd(), "src/client/public");

let viteServer: unknown = null;

async function setupClientMiddleware() {
  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const instance = await createViteServer({
      root: clientRoot,
      configFile: join(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true, hmr: { port: 0 } },
      appType: "custom",
    });
    viteServer = instance;
    app.use((instance as any).middlewares);
    return;
  }

  app.use(express.static(staticRoot));
}

function sendIndexHtml(req: express.Request, res: express.Response) {
  if (isDev && viteServer) {
    const template = readFileSync(indexHtmlPath, "utf-8");
    return (viteServer as any)
      .transformIndexHtml(req.originalUrl, template)
      .then((html: string) => {
        res.status(200).set({ "Content-Type": "text/html" }).send(html);
      });
  }

  res.sendFile(join(staticRoot, "index.html"));
}

// ── 起動 ─────────────────────────────────────────────────────────────

(async () => {
  try {
    await setupClientMiddleware();

    // SPA フォールバック: API・静的資産にマッチしなければ index.html を返す
    app.get(/.*/, (req, res) => {
      return sendIndexHtml(req, res);
    });

    server.listen(PORT, () => {
      console.log(`Web app server listening on http://localhost:${PORT}`);
      console.log(`Comments session file: ${sessionFile}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
