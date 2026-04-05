import { WebSocket } from "ws";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import type { CommentPayload, ConfigPayload } from "../shared/types";

export type ClientSocket = WebSocket & {
  clientId?: string;
  role?: string;
};

// ── コメント永続化 ────────────────────────────────────────────────────

const dataDir = join(process.cwd(), "web-data");
mkdirSync(dataDir, { recursive: true });

export const sessionFile = join(
  dataDir,
  `comments-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
);

function loadComments(): CommentPayload[] {
  if (!existsSync(sessionFile)) return [];
  try {
    return JSON.parse(readFileSync(sessionFile, "utf8")) as CommentPayload[];
  } catch {
    return [];
  }
}

// ── 共有ステート ──────────────────────────────────────────────────────

export const state = {
  comments: loadComments(),
  clients: new Map<string, ClientSocket>(),
  screenSender: null as ClientSocket | null,
  nextViewerId: 1,
  config: {
    durationSec: 3,
    fontSize: 32,
    pinDurationSec: 3,
    forceColor: false,
    forcedColor: "#ffffff",
  } as ConfigPayload,
};

// ── 操作ヘルパー ──────────────────────────────────────────────────────

export function persistComments() {
  try {
    writeFileSync(sessionFile, JSON.stringify(state.comments, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist comments:", err);
  }
}

export function broadcast(payload: unknown) {
  const message = JSON.stringify(payload);
  for (const ws of state.clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function safeSend(ws: ClientSocket | undefined | null, payload: unknown) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
