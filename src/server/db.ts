import { mkdirSync } from "fs";
import { join } from "path";
import { DatabaseSync } from "node:sqlite";
import type { CommentPayload } from "../shared/types";

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

const insertStmt = db.prepare(
  `INSERT INTO comments (id, author, text, color, size, pinPosition, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
);

export function loadRecentComments(): CommentPayload[] {
  const since = Date.now() - ONE_DAY_MS;
  const rows = db
    .prepare(
      `SELECT * FROM comments WHERE createdAt > ? ORDER BY createdAt DESC LIMIT ?`,
    )
    .all(since, MAX_MEMORY_COMMENTS) as CommentPayload[];
  return rows.reverse();
}

export function insertComment(comment: CommentPayload): void {
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
}

export { MAX_MEMORY_COMMENTS };
