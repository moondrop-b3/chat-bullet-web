export type CommentPayload = {
  id: string;
  author: string;
  text: string;
  color: string;
  size: "small" | "medium" | "large";
  pinPosition: "top" | "bottom" | null;
  createdAt: number;
};

export type ConfigPayload = {
  durationSec: number;
  fontSize: number;
  pinDurationSec: number;
  forceColor: boolean;
  forcedColor: string;
};

export type WsMessage =
  | { type: "offer"; viewerId: string; offer: unknown }
  | { type: "answer"; viewerId: string; answer: unknown }
  | {
      type: "ice-candidate";
      target: "viewer" | "sender";
      viewerId: string;
      candidate: unknown;
    }
  | { type: "config"; config: Partial<ConfigPayload> }
  | { type: "bullet"; comment: CommentPayload }
  | { type: "server"; message: string; viewerId?: string }
  | { type: "new-viewer"; viewerId: string }
  | { type: "clearLog"; before: number }
  | { type: string; [key: string]: unknown };
