import { ref, onUnmounted } from "vue";
import type { WsMessage } from "../../shared/types";

type MessageHandler = (msg: WsMessage) => void;

export function useWebSocket(role: string) {
  const connected = ref(false);
  const handlers = new Set<MessageHandler>();
  let ws: WebSocket | null = null;
  let destroyed = false;

  function connect() {
    if (destroyed) return;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${proto}//${location.host}/ws?role=${role}`);

    ws.addEventListener("open", () => {
      connected.value = true;
    });
    ws.addEventListener("close", () => {
      connected.value = false;
      if (!destroyed) setTimeout(connect, 3000);
    });
    ws.addEventListener("message", (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage;
        for (const handler of handlers) handler(msg);
      } catch {
        // ignore malformed messages
      }
    });
  }

  function send(payload: unknown): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function onMessage(handler: MessageHandler): void {
    handlers.add(handler);
  }

  function disconnect(): void {
    destroyed = true;
    ws?.close();
  }

  connect();
  onUnmounted(disconnect);

  return { connected, send, onMessage };
}
