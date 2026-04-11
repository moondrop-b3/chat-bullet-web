<script setup lang="ts">
import { ref, reactive, useTemplateRef, onMounted, nextTick } from "vue";
import { useWebSocket } from "../composables/useWebSocket";
import { useCommentLog } from "../composables/useCommentLog";
import { useCommentForm } from "../composables/useCommentForm";
import { useScreenShare } from "../composables/useScreenShare";
import { getComments } from "../api/client";
import type { CommentPayload, ConfigPayload } from "../../shared/types";
import CommentFormFooter from "../components/CommentFormFooter.vue";
import RapidPanel from "../components/RapidPanel.vue";

const previewEl = useTemplateRef<HTMLVideoElement>("previewEl");
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

// ── WebSocket: 共有シグナリング + config 送信 ─────────────────────────
const { send: wsSend, onMessage: onShareMsg } = useWebSocket("share");

function sendConfig() {
  wsSend({ type: "config", config: { ...config } });
}


const { sharing, shareStatusText, startShare, stopShare, rtc } = useScreenShare(
  previewEl,
  wsSend,
  sendConfig,
);

onShareMsg(async (msg) => {
  if (msg.type === "new-viewer") {
    await rtc.createOffer(msg.viewerId as string);
  } else if (msg.type === "answer") {
    await rtc.handleAnswer(msg.viewerId as string, msg.answer);
  } else if (msg.type === "ice-candidate") {
    await rtc.handleIceCandidate(msg.viewerId as string, msg.candidate);
  }
});

// ── WebSocket: コメント受信 ────────────────────────────────────────────
const { onMessage: onCommentMsg } = useWebSocket("comment");
onCommentMsg((msg) => {
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
  <div class="share-bg h-full flex flex-col">
    <!-- 画面共有プレビュー -->
    <div class="share-section">
      <div style="display: grid; gap: 8px">
        <div class="preview-label">画面共有プレビュー (/view が受信画面)</div>
        <video
          ref="previewEl"
          autoplay
          playsinline
          muted
          class="preview-video"
        />
        <!-- 共有操作ボタン -->
        <div class="flex flex-wrap gap-1.5 items-center">
          <button
            v-if="!sharing"
            type="button"
            class="btn-start rounded-md px-3 py-2 text-sm font-bold cursor-pointer text-white"
            @click="startShare"
          >
            共有を開始
          </button>
          <button
            v-else
            type="button"
            class="btn-stop rounded-md px-3 py-2 text-sm cursor-pointer"
            @click="stopShare"
          >
            共有を停止
          </button>
          <span v-if="forceColor" class="force-color-warn">⚠ 文字色強制中</span>
        </div>
        <div class="share-status">{{ shareStatusText }}</div>
      </div>
    </div>

    <!-- 表示設定スライダー -->
    <div class="share-section">
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
.share-bg {
  background: #111;
  color: #eee;
}

.share-section {
  padding: 10px 12px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

.preview-label {
  font-size: 0.85rem;
  color: #cbd5e1;
}

.preview-video {
  width: 100%;
  min-height: 160px;
  max-height: 280px;
  border-radius: 12px;
  background: #000;
}

.share-status {
  font-size: 0.85rem;
  color: #94a3b8;
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

.btn-start {
  background: #22c55e;
  border: none;
}

.btn-stop {
  background: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
}

.force-color-warn {
  font-size: 0.7rem;
  color: #f59e0b;
}
</style>
