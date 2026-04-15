import type { WebSocketServer } from "ws";
import { state } from "../store";
import type { ClientSocket } from "../store";

export function registerWebSocket(wss: WebSocketServer) {
  wss.on("connection", (rawWs) => {
    const ws = rawWs as ClientSocket;
    const clientId = String(state.nextClientId++);

    state.clients.set(clientId, ws);

    ws.on("close", () => {
      state.clients.delete(clientId);
    });
  });
}
