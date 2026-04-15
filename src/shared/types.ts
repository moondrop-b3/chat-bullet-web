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

export type RapidStock = {
  label: string;
  text: string;
  color: string;
  size: CommentSize;
  pin: PinPosition;
};

export type WsMessage = { type: "bullet"; comment: CommentPayload };
