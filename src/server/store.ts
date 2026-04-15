import { WebSocket } from "ws";
import type { CommentPayload, ConfigPayload } from "../shared/types";
import { loadRecentComments, insertComment, MAX_MEMORY_COMMENTS } from "./db";

export type ClientSocket = WebSocket & {
  clientId?: string;
  role?: string;
};

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
