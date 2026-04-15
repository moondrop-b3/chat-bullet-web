import { WebSocket } from "ws";
import type { CommentPayload } from "../shared/types";
import { loadRecentComments, insertComment, MAX_MEMORY_COMMENTS } from "./db";

export type ClientSocket = WebSocket;

export const state = {
  comments: loadRecentComments(),
  clients: new Map<string, ClientSocket>(),
  nextClientId: 1,
};

export function addComment(comment: CommentPayload): void {
  insertComment(comment);
  state.comments.push(comment);
  if (state.comments.length > MAX_MEMORY_COMMENTS) {
    state.comments.shift();
  }
}

export function broadcast(payload: unknown): void {
  const message = JSON.stringify(payload);
  for (const ws of state.clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function safeSend(ws: ClientSocket | undefined | null, payload: unknown): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
