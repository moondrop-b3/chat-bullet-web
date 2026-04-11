import type { CommentSize, PinPosition } from "../../shared/types";

export const SIZES = [
  { value: "small", label: "小" },
  { value: "medium", label: "中" },
  { value: "large", label: "大" },
] as const satisfies readonly { value: CommentSize; label: string }[];

export const PINS = [
  { value: null, label: "流れる" },
  { value: "top", label: "上" },
  { value: "bottom", label: "下" },
] as const satisfies readonly { value: PinPosition; label: string }[];
