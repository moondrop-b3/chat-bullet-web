import { ref, onUnmounted } from "vue";
import type { WsMessage } from "../../shared/types";

type MessageHandler = (msg: WsMessage) => void;

function isWsMessage(value: unknown): value is WsMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as Record<string, unknown>).type === "string"
  );
}

export function useWebSocket(role: string) {
  const isConnected = ref(false);
  const handlers = new Set<MessageHandler>();
  let ws: WebSocket | null = null;
  let isDestroyed = false;

  function connect() {
    if (isDestroyed) {
      return;
    }
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${proto}//${location.host}/ws?role=${role}`);

    ws.addEventListener("open", () => {
      isConnected.value = true;
    });
    ws.addEventListener("close", () => {
      isConnected.value = false;
      if (!isDestroyed) {
        setTimeout(connect, 3000);
      }
    });
    ws.addEventListener("message", (event: MessageEvent) => {
      try {
        const parsed: unknown = JSON.parse(String(event.data));
        if (!isWsMessage(parsed)) {
          return;
        }
        for (const handler of handlers) {
          handler(parsed);
        }
      } catch {
        // 不正なメッセージは無視する
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
    isDestroyed = true;
    ws?.close();
  }

  connect();
  onUnmounted(disconnect);

  return { isConnected, send, onMessage };
}
