<script setup lang="ts">
import { ref, computed, useTemplateRef, onMounted, onUnmounted } from "vue";
import { useWebSocket } from "../composables/useWebSocket";
import { useWebRTCReceiver } from "../composables/useWebRTC";
import type { CommentPayload, ConfigPayload } from "../../shared/types";

// ── 状態 ──────────────────────────────────────────────────────────────
const pageEl = useTemplateRef<HTMLElement>("pageEl");
const videoEl = useTemplateRef<HTMLVideoElement>("videoEl");
const overlayEl = useTemplateRef<HTMLElement>("overlayEl");
const pinnedTopEl = useTemplateRef<HTMLElement>("pinnedTopEl");
const pinnedBottomEl = useTemplateRef<HTMLElement>("pinnedBottomEl");

const hasStream = ref(false);
const commentsEnabled = ref(true);
const toolbarVisible = ref(false);
const commentAreaMode = ref<"full" | "top" | "bottom">("full");

const COMMENT_AREA_MODES: Array<"full" | "top" | "bottom"> = [
  "full",
  "top",
  "bottom",
];
const commentAreaLabel = computed(() => {
  if (commentAreaMode.value === "full") return "全体";
  if (commentAreaMode.value === "top") return "上半分";
  return "下半分";
});

function cycleCommentArea() {
  const i = COMMENT_AREA_MODES.indexOf(commentAreaMode.value);
  commentAreaMode.value =
    COMMENT_AREA_MODES[(i + 1) % COMMENT_AREA_MODES.length];
}

// ── 弾幕レーン管理 ─────────────────────────────────────────────────────
const LANE_COUNT = 12;
const LANE_INTERVAL_MS = 800;
const SIZE_RATIOS: Record<string, number> = {
  small: 0.7,
  medium: 1.0,
  large: 1.5,
};
const laneLastUsed = Array.from({ length: LANE_COUNT }, () => 0);
const pinTimers = new Map<string, ReturnType<typeof setTimeout>>();

let config: ConfigPayload = {
  durationSec: 3,
  fontSize: 32,
  pinDurationSec: 3,
  forceColor: false,
  forcedColor: "#ffffff",
};

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
  if (mode === "top") return `${5 + (lane % 5) * 8}%`;
  if (mode === "bottom") return `${55 + (lane % 5) * 8}%`;
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
  if (!overlay) return;
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
  if (!commentsEnabled.value) return;
  if (comment.pinPosition === "top" || comment.pinPosition === "bottom") {
    addPinnedComment(comment);
  } else {
    addFlowComment(comment);
  }
}

// ── WebSocket + WebRTC ────────────────────────────────────────────────
const { send, onMessage } = useWebSocket("view");

const rtc = useWebRTCReceiver(
  (payload) => send(payload),
  (stream) => {
    if (videoEl.value) {
      videoEl.value.srcObject = stream;
      videoEl.value.muted = true;
      videoEl.value.play().catch(() => {});
    }
    hasStream.value = true;
  },
);

onMessage(async (msg) => {
  if (msg.type === "offer") {
    await rtc.handleOffer(msg.viewerId as string, msg.offer);
  } else if (msg.type === "ice-candidate" && msg.candidate) {
    await rtc.handleIceCandidate(msg.candidate);
  } else if (msg.type === "bullet") {
    addComment(msg.comment as CommentPayload);
  } else if (msg.type === "config") {
    config = { ...config, ...(msg.config as Partial<ConfigPayload>) };
  } else if (msg.type === "server" && msg.message === "sender-disconnected") {
    hasStream.value = false;
    if (videoEl.value) videoEl.value.srcObject = null;
    rtc.close();
  }
});

onMounted(() => {
  // keyframes をドキュメントに追加（重複は1回のみ）
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
  pinTimers.forEach((t) => clearTimeout(t));
  rtc.close();
});
</script>

<template>
  <div
    ref="pageEl"
    class="view-page"
    @mouseenter="toolbarVisible = true"
    @mouseleave="toolbarVisible = false"
  >
    <!-- 映像ラッパー -->
    <div class="stream-container">
      <!-- プレースホルダー（共有なし時） -->
      <div v-show="!hasStream" class="no-stream-overlay">
        <div class="no-stream-screen">
          <p class="no-stream-text">画面共有が開始されていません。</p>
        </div>
      </div>

      <!-- 受信映像 -->
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
    <div ref="overlayEl" v-show="commentsEnabled" class="comment-overlay">
      <div ref="pinnedTopEl" class="pinned-top" />
      <div ref="pinnedBottomEl" class="pinned-bottom" />
    </div>

    <!-- ツールバー（ホバーで表示） -->
    <div
      class="toolbar"
      :style="{
        opacity: toolbarVisible ? 1 : 0,
        pointerEvents: toolbarVisible ? 'auto' : 'none',
      }"
    >
      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'toolbar-btn--active': commentsEnabled }"
        @click="commentsEnabled = !commentsEnabled"
      >
        コメント {{ commentsEnabled ? "OFF" : "ON" }}
      </button>
      <button type="button" class="toolbar-btn" @click="cycleCommentArea">
        表示: {{ commentAreaLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.view-page {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #334155;
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
  position: relative;
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
  top: 12px;
  right: 12px;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  background: rgba(15, 23, 42, 0.85);
  border-radius: 14px;
  transition: opacity 160ms ease;
  z-index: 95;
}

.toolbar-btn {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  padding: 8px 12px;
  font-size: 0.85rem;
  cursor: pointer;
}

.toolbar-btn--active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.22);
}
</style>
