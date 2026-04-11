<script setup lang="ts">
import { ref, useTemplateRef, onMounted, nextTick } from "vue";
import { useWebSocket } from "../composables/useWebSocket";
import { useCommentLog } from "../composables/useCommentLog";
import { useCommentForm } from "../composables/useCommentForm";
import { getComments } from "../api/client";
import type { CommentPayload } from "../../shared/types";
import CommentFormFooter from "../components/CommentFormFooter.vue";
import RapidPanel from "../components/RapidPanel.vue";

const logAreaEl = useTemplateRef<HTMLElement>("logAreaEl");
const { comments, newCount, formatTime, scrollToBottom, onScroll, appendComment } = useCommentLog(logAreaEl);
const { sendComment } = useCommentForm();

const forceColor = ref(false);

const { onMessage } = useWebSocket("comment");

onMessage((msg) => {
  if (msg.type === "bullet") {
    appendComment(msg.comment as CommentPayload);
  } else if (msg.type === "config" && msg.config) {
    const cfg = msg.config as { forceColor?: boolean };
    if (typeof cfg.forceColor === "boolean") forceColor.value = cfg.forceColor;
  } else if (msg.type === "clearLog") {
    const before = (msg as { before: number }).before;
    comments.value = comments.value.filter((c) => c.createdAt >= before);
  }
});

onMounted(async () => {
  try {
    comments.value = await getComments();
  } catch (err) {
    console.error("Failed to load comments:", err);
  }
  await nextTick(scrollToBottom);
});
</script>

<template>
  <div class="h-full flex flex-col chat-bg">
    <!-- ログエリア -->
    <div
      ref="logAreaEl"
      class="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-1.5"
      @scroll="onScroll"
    >
      <div
        v-for="c in comments"
        :key="c.id"
        class="cb-comment-item rounded-md px-2.5 py-1.5 text-xs break-all"
      >
        <span class="cb-comment-time tabular-nums mr-1">{{ formatTime(c.createdAt) }}</span>
        <span class="font-bold" :style="{ color: c.color || '#22c55e' }" :title="c.author">{{ c.author }}</span>
        <span class="cb-comment-text">: {{ c.text }}</span>
      </div>
    </div>

    <RapidPanel @send="sendComment" />

    <CommentFormFooter
      :new-count="newCount"
      @send="sendComment"
      @scroll-to-bottom="scrollToBottom"
    >
      <div v-if="forceColor" class="force-color-warn text-xs">
        ⚠ 管理者が文字色を強制中
      </div>
    </CommentFormFooter>
  </div>
</template>

<style scoped>
.chat-bg {
  background: #111;
  color: #eee;
}

.force-color-warn {
  color: #f59e0b;
}
</style>
