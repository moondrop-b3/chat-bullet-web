<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  useTemplateRef,
  onMounted,
  onUnmounted,
} from "vue";
import { useRouter } from "vue-router";
import { useWebSocket } from "../composables/useWebSocket";
import type { CommentPayload, ConfigPayload } from "../../shared/types";

const router = useRouter();

// ── 状態 ──────────────────────────────────────────────────────────────
const videoEl = useTemplateRef<HTMLVideoElement>("videoEl");
const overlayEl = useTemplateRef<HTMLElement>("overlayEl");
const pinnedTopEl = useTemplateRef<HTMLElement>("pinnedTopEl");
const pinnedBottomEl = useTemplateRef<HTMLElement>("pinnedBottomEl");

const hasStream = ref(false);
const isCommentsEnabled = ref(true);
const isToolbarVisible = ref(false);
const commentAreaMode = ref<"full" | "top" | "bottom">("full");

const COMMENT_AREA_MODES: Array<"full" | "top" | "bottom"> = [
  "full",
  "top",
  "bottom",
];

const commentAreaLabel = computed(() => {
  if (commentAreaMode.value === "full") {
    return "全体";
  }
  if (commentAreaMode.value === "top") {
    return "上半分";
  }
  return "下半分";
});

function cycleCommentArea() {
  const idx = COMMENT_AREA_MODES.indexOf(commentAreaMode.value);
  commentAreaMode.value =
    COMMENT_AREA_MODES[(idx + 1) % COMMENT_AREA_MODES.length];
}

// ── 設定 ─────────────────────────────────────────────────────────────
const config = reactive<ConfigPayload>({
  durationSec: 4,
  fontSize: 40,
  pinDurationSec: 4,
  forceColor: false,
  forcedColor: "#ffffff",
});

// ── 画面キャプチャ ────────────────────────────────────────────────────
let localStream: MediaStream | null = null;

async function startCapture() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return;
  }
  try {
    localStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    if (videoEl.value) {
      videoEl.value.srcObject = localStream;
      await videoEl.value.play();
    }
    hasStream.value = true;
    localStream
      .getVideoTracks()[0]
      ?.addEventListener("ended", stopCapture, { once: true });
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : "UnknownError";
    if (name !== "NotAllowedError") {
      console.error("Capture failed:", name);
    }
  }
}

function stopCapture() {
  localStream?.getTracks().forEach((track) => track.stop());
  localStream = null;
  if (videoEl.value) {
    videoEl.value.srcObject = null;
  }
  hasStream.value = false;
}

// ── 弾幕レーン管理 ────────────────────────────────────────────────────
const LANE_COUNT = 12;
const LANE_INTERVAL_MS = 800;
const SIZE_RATIOS: Record<string, number> = {
  small: 0.7,
  medium: 1.0,
  large: 1.5,
};
const laneLastUsed = Array.from({ length: LANE_COUNT }, () => 0);
const pinTimers = new Map<string, ReturnType<typeof setTimeout>>();

function pickLane(mode: "full" | "top" | "bottom") {
  const now = Date.now();
  const indexes =
    mode === "top"
      ? [0, 1, 2, 3, 4]
      : mode === "bottom"
        ? [7, 8, 9, 10, 11]
        : Array.from({ length: LANE_COUNT }, (_, i) => i);

  const available = indexes.filter(
    (i) => now - laneLastUsed[i] >= LANE_INTERVAL_MS,
  );
  const pool =
    available.length > 0
      ? available
      : (() => {
          const minTime = Math.min(...indexes.map((i) => laneLastUsed[i]));
          return indexes.filter((i) => laneLastUsed[i] === minTime);
        })();

  const lane = pool[Math.floor(Math.random() * pool.length)];
  laneLastUsed[lane] = now;
  return lane;
}

function getCommentTop(lane: number) {
  const mode = commentAreaMode.value;
  if (mode === "top") {
    return `${5 + (lane % 5) * 8}%`;
  }
  if (mode === "bottom") {
    return `${55 + (lane % 5) * 8}%`;
  }
  return `${(lane / LANE_COUNT) * 100}%`;
}

function createCommentEl(comment: CommentPayload): HTMLElement {
  const el = document.createElement("div");
  el.textContent = comment.text;
  const clr = config.forceColor
    ? config.forcedColor
    : comment.color || "#ffffff";
  const ratio = SIZE_RATIOS[comment.size] ?? 1.0;
  el.style.cssText = `
    white-space:nowrap;
    text-shadow:1px 1px 8px rgba(0,0,0,.85);
    color:${clr};
    font-size:${Math.round(config.fontSize * ratio)}px;
  `;
  el.dataset.commentId = comment.id;
  return el;
}

function addFlowComment(comment: CommentPayload) {
  const overlay = overlayEl.value;
  if (!overlay) {
    return;
  }
  const el = createCommentEl(comment);
  const lane = pickLane(commentAreaMode.value);
  el.style.position = "absolute";
  el.style.left = "100vw";
  el.style.top = getCommentTop(lane);
  el.style.animation = `cb-scroll-left ${config.durationSec}s linear forwards`;
  overlay.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

function addPinnedComment(comment: CommentPayload) {
  const el = createCommentEl(comment);
  el.style.position = "relative";
  el.style.left = "0";
  el.style.textAlign = "center";
  const container =
    comment.pinPosition === "top" ? pinnedTopEl.value : pinnedBottomEl.value;
  if (container) {
    container.appendChild(el);
  } else {
    overlayEl.value?.appendChild(el);
  }
  const timerId = setTimeout(
    () => {
      el.remove();
      pinTimers.delete(comment.id);
    },
    (config.pinDurationSec ?? 3) * 1000,
  );
  pinTimers.set(comment.id, timerId);
}

function addComment(comment: CommentPayload) {
  if (!isCommentsEnabled.value) {
    return;
  }
  if (comment.pinPosition === "top" || comment.pinPosition === "bottom") {
    addPinnedComment(comment);
  } else {
    addFlowComment(comment);
  }
}

// ── WebSocket ─────────────────────────────────────────────────────────
const { send: wsSend, onMessage } = useWebSocket("view");

function sendConfig() {
  wsSend({ type: "config", config: { ...config } });
}

onMessage((msg) => {
  if (msg.type === "bullet") {
    addComment(msg.comment);
  } else if (msg.type === "config") {
    Object.assign(config, msg.config);
  }
});

onMounted(() => {
  if (!document.getElementById("cb-keyframes")) {
    const style = document.createElement("style");
    style.id = "cb-keyframes";
    style.textContent = `
      @keyframes cb-scroll-left {
        from { transform: translateX(0); }
        to   { transform: translateX(calc(-100vw - 100%)); }
      }
    `;
    document.head.appendChild(style);
  }
});

onUnmounted(() => {
  pinTimers.forEach((timer) => clearTimeout(timer));
  stopCapture();
});
</script>

<template>
  <div
    class="view-page"
    @mouseenter="isToolbarVisible = true"
    @mouseleave="isToolbarVisible = false"
  >
    <!-- 映像エリア -->
    <div class="stream-container">
      <div v-show="!hasStream" class="no-stream-overlay">
        <div class="no-stream-screen">
          <p class="no-stream-text">
            ツールバーの「キャプチャ開始」で画面を選択してください。
          </p>
        </div>
      </div>
      <video
        ref="videoEl"
        v-show="hasStream"
        autoplay
        playsinline
        muted
        class="video-el"
      />
    </div>

    <!-- 弾幕オーバーレイ -->
    <div ref="overlayEl" v-show="isCommentsEnabled" class="comment-overlay">
      <div ref="pinnedTopEl" class="pinned-top" />
      <div ref="pinnedBottomEl" class="pinned-bottom" />
    </div>

    <!-- ツールバー（ホバーで表示・上中央） -->
    <div
      class="toolbar"
      :style="{
        opacity: isToolbarVisible ? 1 : 0,
        pointerEvents: isToolbarVisible ? 'auto' : 'none',
      }"
    >
      <button
        v-if="!hasStream"
        type="button"
        class="toolbar-btn toolbar-btn--primary"
        @click="startCapture"
      >
        キャプチャ開始
      </button>
      <button v-else type="button" class="toolbar-btn" @click="stopCapture">
        停止
      </button>

      <div class="toolbar-divider" />

      <label class="slider-wrap">
        <span class="slider-label">文字</span>
        <input
          v-model.number="config.fontSize"
          type="range"
          min="10"
          max="100"
          step="2"
          class="slider"
          @input="sendConfig"
        />
        <span class="slider-value">{{ config.fontSize }}px</span>
      </label>
      <label class="slider-wrap">
        <span class="slider-label">速度</span>
        <input
          v-model.number="config.durationSec"
          type="range"
          min="2"
          max="8"
          step="0.5"
          class="slider"
          @input="sendConfig"
        />
        <span class="slider-value">{{ config.durationSec.toFixed(1) }}s</span>
      </label>
      <label class="slider-wrap">
        <span class="slider-label">固定</span>
        <input
          v-model.number="config.pinDurationSec"
          type="range"
          min="2"
          max="10"
          step="1"
          class="slider"
          @input="sendConfig"
        />
        <span class="slider-value">{{ config.pinDurationSec }}s</span>
      </label>

      <div class="toolbar-divider" />

      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'toolbar-btn--active': isCommentsEnabled }"
        @click="isCommentsEnabled = !isCommentsEnabled"
      >
        コメント {{ isCommentsEnabled ? "OFF" : "ON" }}
      </button>
      <button type="button" class="toolbar-btn" @click="cycleCommentArea">
        {{ commentAreaLabel }}
      </button>

      <div class="toolbar-divider" />

      <button
        type="button"
        class="toolbar-btn"
        :disabled="hasStream"
        @click="router.push('/')"
      >
        Homeに戻る
      </button>
    </div>
  </div>
</template>

<style scoped>
.view-page {
  position: relative;
  width: 100%;
  height: 100vh;
  background: var(--color-border-strong);
  overflow: hidden;
}

.stream-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.no-stream-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #cbd5e1;
  border: 8px solid #ef4444;
  box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.24);
  z-index: 30;
  box-sizing: border-box;
}

.no-stream-screen {
  width: min(84%, 1200px);
  height: min(66%, 760px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px dashed #f87171;
  background: #f8fafc;
  border-radius: 18px;
}

.no-stream-text {
  max-width: 80%;
  line-height: 1.6;
  font-size: 1rem;
  color: #0f172a;
  text-align: center;
}

.video-el {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  z-index: 20;
}

.comment-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 70;
}

.pinned-top {
  position: absolute;
  left: 0;
  right: 0;
  top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
  z-index: 85;
}

.pinned-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16px;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 10px;
  pointer-events: none;
  z-index: 85;
}

.toolbar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.85);
  border-radius: 14px;
  transition: opacity 160ms ease;
  z-index: 95;
  white-space: nowrap;
}

.toolbar-btn {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-bright);
  padding: 6px 10px;
  font-size: 0.8rem;
  cursor: pointer;
}

.toolbar-btn--active {
  border-color: var(--color-accent);
  background: rgba(59, 130, 246, 0.22);
}

.toolbar-btn--primary {
  border-color: var(--color-primary);
  background: rgba(34, 197, 94, 0.22);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-muted);
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
}

.slider-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.slider-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.slider {
  width: 70px;
  accent-color: var(--color-accent);
}

.slider-value {
  font-size: 0.75rem;
  color: var(--color-text-bright);
  min-width: 30px;
}
</style>
