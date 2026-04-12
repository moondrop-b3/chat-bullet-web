import { useLocalStorage } from "./useLocalStorage";
import { postComment } from "../api/client";
import type { PostCommentParams } from "../api/client";

export function useCommentForm() {
  const author = useLocalStorage("chatbullet_author");

  async function sendComment(
    params: Omit<PostCommentParams, "author">,
  ): Promise<void> {
    const authorValue = (author.value ?? "").trim();
    if (!authorValue) {
      return;
    }
    try {
      await postComment({ ...params, author: authorValue });
    } catch (err) {
      console.error("Comment send failed:", err);
    }
  }

  return { sendComment };
}
