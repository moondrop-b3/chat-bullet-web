import type { CommentPayload } from "../../shared/types";

export async function getComments(): Promise<CommentPayload[]> {
  const res = await fetch("/api/comments");
  if (!res.ok) throw new Error(`Failed to load comments: ${res.status}`);
  return res.json() as Promise<CommentPayload[]>;
}

export interface PostCommentParams {
  author: string;
  text: string;
  color: string;
  size: "small" | "medium" | "large";
  pinPosition: "top" | "bottom" | null;
}

export async function postComment(params: PostCommentParams): Promise<void> {
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Failed to post comment: ${res.status}`);
}
