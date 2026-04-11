<script setup lang="ts">
import { ref, reactive, useTemplateRef, onMounted, nextTick } from "vue";
import { useWebSocket } from "../composables/useWebSocket";
import { useCommentLog } from "../composables/useCommentLog";
import { useCommentForm } from "../composables/useCommentForm";
import { getComments } from "../api/client";
import type { CommentPayload, ConfigPayload } from "../../shared/types";
import CommentFormFooter from "../components/CommentFormFooter.vue";
import RapidPanel from "../components/RapidPanel.vue";

const logAreaEl = useTemplateRef<HTMLElement>("logAreaEl");
const { comments, newCount, formatTime, scrollToBottom, onScroll, appendComment } = useCommentLog(logAreaEl);
const { sendComment } = useCommentForm();

const forceColor = ref(false);
const config = reactive<ConfigPayload>({
  durationSec: 3,
  fontSize: 32,
  pinDurationSec: 3,
  forceColor: false,
  forcedColor: "#ffffff",
});

const { send: wsSend, onMessage } = useWebSocket("admin");

function sendConfig() {
  wsSend({ type: "config", config: { ...config } });
}

onMessage((msg) => {
  if (msg.type === "bullet") {
    appendComment(msg.comment as CommentPayload);
  } else if (msg.type === "config" && msg.config) {
    Object.assign(config, msg.config);
    forceColor.value = config.forceColor;
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
  <div class="admin-bg h-full flex flex-col">
    <!-- 表示設定スライダー -->
    <div class="admin-section">
      <div class="flex flex-wrap gap-x-6 gap-y-2 items-center">
        <div class="flex items-center gap-2">
          <span class="slider-label">文字サイズ</span>
          <input
            v-model.number="config.fontSize"
            type="range"
            min="20"
            max="48"
            step="2"
            class="slider"
            @input="sendConfig"
          />
          <span class="slider-value" style="min-width: 32px">{{ config.fontSize }}px</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="slider-label">流れる速度</span>
          <input
            v-model.number="config.durationSec"
            type="range"
            min="2"
            max="8"
            step="0.5"
            class="slider"
            @input="sendConfig"
          />
          <span class="slider-value" style="min-width: 36px">{{ config.durationSec.toFixed(1) }}s</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="slider-label">固定表示</span>
          <input
            v-model.number="config.pinDurationSec"
            type="range"
            min="2"
            max="10"
            step="1"
            class="slider"
            @input="sendConfig"
          />
          <span class="slider-value" style="min-width: 28px">{{ config.pinDurationSec }}s</span>
        </div>
        <span v-if="forceColor" class="force-color-warn">⚠ 文字色強制中</span>
      </div>
    </div>

    <!-- コメントログ -->
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
    />
  </div>
</template>

<style scoped>
.admin-bg {
  background: #111;
  color: #eee;
}

.admin-section {
  padding: 10px 12px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

.slider-label {
  font-size: 0.75rem;
  color: #94a3b8;
  white-space: nowrap;
}

.slider {
  width: 90px;
  accent-color: #3b82f6;
}

.slider-value {
  font-size: 0.75rem;
  color: #f8fafc;
  text-align: right;
}

.force-color-warn {
  font-size: 0.7rem;
  color: #f59e0b;
}
</style>
