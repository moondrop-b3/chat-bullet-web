import { ref } from "vue";
import { postComment } from "../api/client";

export function useCommentForm() {
  const author = ref(localStorage.getItem("chatbullet_author") ?? "");
  const text = ref("");
  const color = ref(localStorage.getItem("chatbullet_color") ?? "#ffffff");
  const size = ref<"small" | "medium" | "large">("medium");
  const pinPosition = ref<"top" | "bottom" | null>(null);

  function saveAuthor() {
    localStorage.setItem("chatbullet_author", author.value);
  }

  function saveColor() {
    localStorage.setItem("chatbullet_color", color.value);
  }

  async function sendComment() {
    const a = author.value.trim();
    const t = text.value.trim();
    if (!a || !t) return;
    try {
      await postComment({
        author: a,
        text: t,
        color: color.value,
        size: size.value,
        pinPosition: pinPosition.value,
      });
      text.value = "";
    } catch (err) {
      console.error("Comment send failed:", err);
    }
  }

  return { author, text, color, size, pinPosition, saveAuthor, saveColor, sendComment };
}
