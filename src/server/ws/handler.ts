import type { WebSocketServer } from "ws";
import type { ConfigPayload } from "../../shared/types";
import { state, broadcast, safeSend } from "../store";
import type { ClientSocket } from "../store";

export function registerWebSocket(wss: WebSocketServer) {
  wss.on("connection", (rawWs) => {
    const ws = rawWs as ClientSocket;
    const clientId = String(state.nextClientId++);

    state.clients.set(clientId, ws);
    safeSend(ws, { type: "config", config: state.config });

    ws.on("message", (raw) => handleMessage(raw.toString()));

    ws.on("close", () => {
      state.clients.delete(clientId);
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

  if (data.type === "config" && typeof data.config === "object" && data.config !== null) {
    handleConfig(data.config as Partial<ConfigPayload>);
    return;
  }
}

function handleConfig(config: Partial<ConfigPayload>) {
  state.config = {
    durationSec: clamp(config.durationSec, state.config.durationSec, 1, 20),
    fontSize: clamp(config.fontSize, state.config.fontSize, 10, 100),
    pinDurationSec: clamp(config.pinDurationSec, state.config.pinDurationSec, 1, 30),
    isForceColor: typeof config.isForceColor === "boolean"
      ? config.isForceColor
      : state.config.isForceColor,
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
