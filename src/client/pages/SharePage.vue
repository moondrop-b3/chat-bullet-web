<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from "vue";
import { useWebSocket } from "../composables/useWebSocket";
import { useCommentLog } from "../composables/useCommentLog";
import { useCommentForm } from "../composables/useCommentForm";
import { useScreenShare } from "../composables/useScreenShare";
import { getComments } from "../api/client";
import type { CommentPayload, ConfigPayload } from "../../shared/types";
import BaseToggleButton from "../components/BaseToggleButton.vue";

const SIZES = [
  { value: "medium" as const, label: "中" },
  { value: "small" as const, label: "小" },
  { value: "large" as const, label: "大" },
];
const PINS = [
  { value: null, label: "流れる" },
  { value: "top" as const, label: "上" },
  { value: "bottom" as const, label: "下" },
];

const previewEl = ref<HTMLVideoElement | null>(null);
const commentLog = useCommentLog();
const { comments, newCount, formatTime, scrollToBottom, onScroll, appendComment } = commentLog;
const { author, text, color, size, pinPosition, saveAuthor, saveColor, sendComment } = useCommentForm();

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
      :ref="el => (commentLog.logAreaEl.value = el as HTMLElement | null)"
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

    <!-- フォームフッター -->
    <footer class="share-footer relative flex flex-col gap-2 p-3">
      <!-- 新着バナー -->
      <div
        v-if="newCount > 0"
        class="cb-new-banner absolute z-20 cursor-pointer select-none rounded-full px-4 py-1 text-xs font-bold text-white"
        @click="scrollToBottom"
      >
        ↓ {{ newCount }}件の新着
      </div>

      <!-- 共有操作ボタン -->
      <div class="flex flex-wrap gap-1.5 items-center">
        <button
          type="button"
          :disabled="sharing"
          class="btn-start rounded-md px-3 py-2 text-sm font-bold cursor-pointer text-white"
          @click="startShare"
        >共有を開始</button>
        <button
          type="button"
          :disabled="!sharing"
          class="btn-stop rounded-md px-3 py-2 text-sm cursor-pointer"
          @click="stopShare"
        >共有を停止</button>
        <span v-if="forceColor" class="force-color-warn">⚠ 文字色強制中</span>
      </div>

      <!-- 名前・コメント入力 -->
      <div class="flex flex-wrap gap-1.5">
        <input
          v-model="author"
          type="text"
          placeholder="名前（必須）"
          maxlength="25"
          class="form-input rounded-md px-2.5 py-2 text-sm"
          style="flex: 1; min-width: 120px"
          @input="saveAuthor"
        />
        <input
          v-model="text"
          type="text"
          placeholder="コメント（必須）"
          maxlength="250"
          autocomplete="off"
          class="form-input rounded-md px-2.5 py-2 text-sm"
          style="flex: 2; min-width: 160px"
          @keydown.enter.prevent="sendComment"
        />
        <input
          v-model="color"
          type="color"
          title="文字色"
          class="color-picker w-10 h-9 rounded-md cursor-pointer flex-shrink-0"
          @input="saveColor"
        />
        <button
          type="button"
          class="btn-send rounded-md px-3.5 py-2 text-sm font-bold flex-shrink-0 cursor-pointer text-white"
          @click="sendComment"
        >送信</button>
      </div>

      <!-- サイズ・位置 -->
      <div class="flex flex-wrap gap-2 items-center">
        <span class="cb-label-muted text-xs">サイズ:</span>
        <BaseToggleButton
          v-for="s in SIZES"
          :key="s.value"
          :active="size === s.value"
          active-style="background:#3b82f6;border:1px solid #3b82f6;color:#fff"
          inactive-style="background:#0f172a;border:1px solid #334155;color:#aaa"
          @click="size = s.value"
        >{{ s.label }}</BaseToggleButton>
        <span class="cb-label-muted text-xs ml-2">位置:</span>
        <BaseToggleButton
          v-for="p in PINS"
          :key="String(p.value)"
          :active="pinPosition === p.value"
          active-style="background:#3b82f6;border:1px solid #3b82f6;color:#fff"
          inactive-style="background:#0f172a;border:1px solid #334155;color:#aaa"
          @click="pinPosition = p.value"
        >{{ p.label }}</BaseToggleButton>
      </div>
    </footer>
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

.share-footer {
  background: #111827;
  border-top: 1px solid #1f2937;
  flex-shrink: 0;
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

.form-input {
  background: #0f172a;
  border: 1px solid #334155;
  color: #eee;
}

.color-picker {
  background: #0f172a;
  border: 1px solid #334155;
  padding: 2px;
}

.btn-send {
  background: #22c55e;
  border: none;
}
</style>
