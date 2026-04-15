import express from "express";
import { createServer } from "https";
import { WebSocketServer } from "ws";
import { existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { networkInterfaces } from "os";
import { execSync } from "child_process";
import commentsRouter from "./routes/comments";
import { registerWebSocket } from "./ws/handler";
import { dbPath } from "./db";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
const certDir = join(process.cwd(), "certs");

function ensureCerts() {
  const keyPath = join(certDir, "key.pem");
  const certPath = join(certDir, "cert.pem");
  if (existsSync(keyPath) && existsSync(certPath)) return;
  console.log("証明書が見つかりません。自己署名証明書を生成します...");
  mkdirSync(certDir, { recursive: true });
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 3650 -nodes -subj "//CN=localhost"`,
    { stdio: "inherit" },
  );
  console.log("証明書を生成しました。");
}

ensureCerts();

const server = createServer(
  {
    key: readFileSync(join(certDir, "key.pem")),
    cert: readFileSync(join(certDir, "cert.pem")),
  },
  app,
);
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
      server: { middlewareMode: true, hmr: { server } },
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

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`https://localhost:${PORT}`);
      const nets = networkInterfaces();
      for (const [name, iface] of Object.entries(nets)) {
        if (name.startsWith("vEthernet")) continue;
        for (const addr of iface ?? []) {
          if (addr.family === "IPv4" && !addr.internal) {
            console.log(`https://${addr.address}:${PORT} (${name})`);
          }
        }
      }
      console.log(`Comments DB: ${dbPath}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
