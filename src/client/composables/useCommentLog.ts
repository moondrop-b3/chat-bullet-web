import { ref, nextTick } from "vue";
import type { Ref } from "vue";
import type { CommentPayload } from "../../shared/types";

export function useCommentLog(logAreaEl: Ref<HTMLElement | null>) {
  const comments = ref<CommentPayload[]>([]);
  const newCount = ref(0);

  function formatTime(ts: number) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function isAtBottom() {
    const el = logAreaEl.value;
    if (!el) return true;
    return el.scrollHeight - el.clientHeight - el.scrollTop <= 4;
  }

  function scrollToBottom() {
    const el = logAreaEl.value;
    if (el) el.scrollTop = el.scrollHeight;
    newCount.value = 0;
  }

  function onScroll() {
    if (isAtBottom()) newCount.value = 0;
  }

  function appendComment(c: CommentPayload) {
    const atBottom = isAtBottom();
    comments.value.push(c);
    if (atBottom) {
      nextTick(scrollToBottom);
    } else {
      newCount.value++;
    }
  }

  return { comments, newCount, formatTime, scrollToBottom, onScroll, appendComment };
}
