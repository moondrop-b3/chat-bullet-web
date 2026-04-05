import type { WebSocketServer } from "ws";
import type { ConfigPayload } from "../../shared/types";
import { state, broadcast, safeSend } from "../store";
import type { ClientSocket } from "../store";

export function registerWebSocket(wss: WebSocketServer) {
  wss.on("connection", (rawWs, req) => {
    const ws = rawWs as ClientSocket;
    const params = new URLSearchParams(req.url?.split("?")[1]);
    const role = params.get("role") || "viewer";
    const clientId = String(state.nextViewerId++);
    ws.clientId = clientId;
    ws.role = role;

    state.clients.set(clientId, ws);
    safeSend(ws, { type: "config", config: state.config });

    if (role === "share") {
      state.screenSender = ws;
      safeSend(ws, { type: "server", message: "sender-connected" });
      for (const viewer of state.clients.values()) {
        if (viewer !== ws && viewer.role === "view") {
          safeSend(state.screenSender, { type: "new-viewer", viewerId: viewer.clientId });
        }
      }
    } else {
      safeSend(ws, { type: "server", message: "viewer-connected", viewerId: clientId });
      if (state.screenSender) {
        safeSend(state.screenSender, { type: "new-viewer", viewerId: clientId });
      }
    }

    ws.on("message", (raw) => handleMessage(raw.toString()));

    ws.on("close", () => {
      state.clients.delete(clientId);
      if (ws === state.screenSender) {
        state.screenSender = null;
        for (const other of state.clients.values()) {
          if (other.role === "viewer") {
            safeSend(other, { type: "server", message: "sender-disconnected" });
          }
        }
      }
    });
  });
}

// ── メッセージルーティング ────────────────────────────────────────────

type RawMsg = { type: string; [key: string]: unknown };

function handleMessage(raw: string) {
  let data: RawMsg;
  try {
    data = JSON.parse(raw) as RawMsg;
  } catch {
    return;
  }

  if (data.type === "offer") {
    const viewerId = asString(data.viewerId);
    if (!viewerId) return;
    const peer = state.clients.get(viewerId);
    safeSend(peer, { type: "offer", viewerId, offer: data.offer });
    return;
  }

  if (data.type === "answer" && state.screenSender) {
    const viewerId = asString(data.viewerId);
    if (!viewerId) return;
    safeSend(state.screenSender, { type: "answer", viewerId, answer: data.answer });
    return;
  }

  if (data.type === "ice-candidate") {
    const viewerId = asString(data.viewerId);
    if (!viewerId) return;
    if (data.target === "viewer") {
      const peer = state.clients.get(viewerId);
      safeSend(peer, { type: "ice-candidate", viewerId, candidate: data.candidate });
    } else if (data.target === "sender" && state.screenSender) {
      safeSend(state.screenSender, { type: "ice-candidate", viewerId, candidate: data.candidate });
    }
    return;
  }

  if (data.type === "config" && typeof data.config === "object" && data.config !== null) {
    handleConfig(data.config as Partial<ConfigPayload>);
    return;
  }
}

function handleConfig(config: Partial<ConfigPayload>) {
  state.config = {
    durationSec: clamp(config.durationSec, state.config.durationSec, 1, 20),
    fontSize: clamp(config.fontSize, state.config.fontSize, 16, 64),
    pinDurationSec: clamp(config.pinDurationSec, state.config.pinDurationSec, 1, 30),
    forceColor: typeof config.forceColor === "boolean"
      ? config.forceColor
      : state.config.forceColor,
    forcedColor: typeof config.forcedColor === "string"
      ? config.forcedColor
      : state.config.forcedColor,
  };
  broadcast({ type: "config", config: state.config });
}

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number") return fallback;
  if (value < min || value > max) return fallback;
  return value;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
