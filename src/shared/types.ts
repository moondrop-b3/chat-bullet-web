export type CommentSize = "small" | "medium" | "large";
export type PinPosition = "top" | "bottom" | null;

export type CommentPayload = {
  id: string;
  author: string;
  text: string;
  color: string;
  size: CommentSize;
  pinPosition: PinPosition;
  createdAt: number;
};

export type ConfigPayload = {
  durationSec: number;
  fontSize: number;
  pinDurationSec: number;
  isForceColor: boolean;
  forcedColor: string;
};

export type RapidStock = {
  label: string;
  text: string;
  color: string;
  size: CommentSize;
  pin: PinPosition;
};

export type WsMessage =
  | { type: "config"; config: Partial<ConfigPayload> }
  | { type: "bullet"; comment: CommentPayload };
