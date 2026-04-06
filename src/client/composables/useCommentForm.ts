import { useLocalStorage } from "./useLocalStorage";
import { postComment } from "../api/client";
import type { PostCommentParams } from "../api/client";

export function useCommentForm() {
  const author = useLocalStorage("chatbullet_author");

  async function sendComment(
    params: Omit<PostCommentParams, "author">,
  ): Promise<void> {
    const a = (author.value ?? "").trim();
    if (!a) return;
    try {
      await postComment({ ...params, author: a });
    } catch (err) {
      console.error("Comment send failed:", err);
    }
  }

  return { sendComment };
}
