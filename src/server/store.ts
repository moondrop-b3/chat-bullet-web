import { WebSocket } from "ws";
import { mkdirSync } from "fs";
import { join } from "path";
import { DatabaseSync } from "node:sqlite";
import type { CommentPayload, ConfigPayload } from "../shared/types";

export type ClientSocket = WebSocket & {
  clientId?: string;
  role?: string;
};

// ── DB初期化 ──────────────────────────────────────────────────────────

const dataDir = join(process.cwd(), "web-data");
mkdirSync(dataDir, { recursive: true });

export const dbPath = join(dataDir, "comments.db");
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT    PRIMARY KEY,
    author      TEXT    NOT NULL,
    text        TEXT    NOT NULL,
    color       TEXT    NOT NULL,
    size        TEXT    NOT NULL,
    pinPosition TEXT,
    createdAt   INTEGER NOT NULL
  )
`);

const MAX_MEMORY_COMMENTS = 100;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function loadRecentComments(): CommentPayload[] {
  const since = Date.now() - ONE_DAY_MS;
  const rows = db
    .prepare(
      `SELECT * FROM comments WHERE createdAt > ? ORDER BY createdAt DESC LIMIT ?`,
    )
    .all(since, MAX_MEMORY_COMMENTS) as CommentPayload[];
  return rows.reverse();
}

// ── 共有ステート ──────────────────────────────────────────────────────

export const state = {
  comments: loadRecentComments(),
  clients: new Map<string, ClientSocket>(),
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

const insertStmt = db.prepare(
  `INSERT INTO comments (id, author, text, color, size, pinPosition, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
);

export function insertComment(comment: CommentPayload) {
  try {
    insertStmt.run(
      comment.id,
      comment.author,
      comment.text,
      comment.color,
      comment.size,
      comment.pinPosition ?? null,
      comment.createdAt,
    );
  } catch (err) {
    console.error("Failed to insert comment:", err);
  }
  state.comments.push(comment);
  if (state.comments.length > MAX_MEMORY_COMMENTS) {
    state.comments.shift();
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
