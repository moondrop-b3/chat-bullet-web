<script setup lang="ts">
import { useTemplateRef, onMounted, nextTick } from "vue";
import { useWebSocket } from "../composables/useWebSocket";
import { useCommentLog } from "../composables/useCommentLog";
import { useCommentForm } from "../composables/useCommentForm";
import { getComments } from "../api/client";
import CommentFormFooter from "../components/CommentFormFooter.vue";
import RapidPanel from "../components/RapidPanel.vue";

const logAreaEl = useTemplateRef<HTMLElement>("logAreaEl");
const {
  comments,
  newCount,
  formatTime,
  scrollToBottom,
  onScroll,
  appendComment,
} = useCommentLog(logAreaEl);
const { sendComment } = useCommentForm();

const { onMessage } = useWebSocket("comment");

onMessage((msg) => {
  if (msg.type === "bullet") {
    appendComment(msg.comment);
  } else if (msg.type === "clearLog") {
    comments.value = comments.value.filter(
      (comment) => comment.createdAt >= msg.before,
    );
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
  <div class="h-full flex flex-col bg-cb-bg text-cb-text">
    <!-- ログエリア -->
    <div
      ref="logAreaEl"
      class="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-1.5"
      @scroll="onScroll"
    >
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="cb-comment-item rounded-md px-2.5 py-1.5 text-xs break-all"
      >
        <span class="cb-comment-time tabular-nums mr-1">{{
          formatTime(comment.createdAt)
        }}</span>
        <span
          class="font-bold"
          :style="{ color: comment.color || 'var(--color-primary)' }"
          :title="comment.author"
          >{{ comment.author }}</span
        >
        <span class="cb-comment-text">: {{ comment.text }}</span>
      </div>
    </div>

    <RapidPanel @send="sendComment" />

    <CommentFormFooter
      :new-count="newCount"
      @send="sendComment"
      @scroll-to-bottom="scrollToBottom"
    />
  </div>
</template>
