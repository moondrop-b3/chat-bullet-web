<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  useTemplateRef,
  onUnmounted,
} from "vue";
import { useRouter } from "vue-router";
import { useWebSocket } from "../composables/useWebSocket";
import type {
  CommentPayload,
  ConfigPayload,
  CommentSize,
} from "../../shared/types";

const router = useRouter();

// ── 状態 ──────────────────────────────────────────────────────────────
const videoEl = useTemplateRef<HTMLVideoElement>("videoEl");
const overlayEl = useTemplateRef<HTMLElement>("overlayEl");
const pinnedTopEl = useTemplateRef<HTMLElement>("pinnedTopEl");
const pinnedBottomEl = useTemplateRef<HTMLElement>("pinnedBottomEl");

const hasStream = ref(false);
const isCommentsEnabled = ref(true);
const isToolbarVisible = ref(false);
type CommentAreaMode = "full" | "top" | "bottom";

const commentAreaMode = ref<CommentAreaMode>("full");

const COMMENT_AREA_MODES: CommentAreaMode[] = ["full", "top", "bottom"];

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
  isForceColor: false,
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
const SIZE_RATIOS: Record<CommentSize, number> = {
  small: 0.7,
  medium: 1.0,
  large: 1.5,
};
const laneLastUsed = Array.from({ length: LANE_COUNT }, () => 0);
const pinTimers = new Map<string, ReturnType<typeof setTimeout>>();

function pickLane(mode: CommentAreaMode) {
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
  const clr = config.isForceColor
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
const { send: wsSend, onMessage } = useWebSocket();

function sendConfig() {
  wsSend({ type: "config", config: { ...config } });
}

function toggleForceColor() {
  config.isForceColor = !config.isForceColor;
  sendConfig();
}

onMessage((msg) => {
  if (msg.type === "bullet") {
    addComment(msg.comment);
  } else if (msg.type === "config") {
    Object.assign(config, msg.config);
  }
});

onUnmounted(() => {
  pinTimers.forEach((timer) => clearTimeout(timer));
  stopCapture();
});
</script>

<template>
  <div
    class="relative w-full h-screen bg-cb-border-strong overflow-hidden"
    @mouseenter="isToolbarVisible = true"
    @mouseleave="isToolbarVisible = false"
  >
    <!-- 映像エリア -->
    <div
      class="absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <div
        v-show="!hasStream"
        class="absolute inset-0 flex flex-col items-center justify-center bg-cb-stream-placeholder-bg z-30"
      >
        <p
          class="text-4xl font-black tracking-[0.4em] text-cb-stream-screen-text uppercase"
        >
          No Signal
        </p>
        <p
          class="mt-4 text-xs tracking-[0.2em] text-cb-stream-screen-text opacity-40"
        >
          ツールバーの「キャプチャ開始」で画面を選択してください。
        </p>
      </div>
      <video
        ref="videoEl"
        v-show="hasStream"
        autoplay
        playsinline
        muted
        class="absolute inset-0 w-full h-full object-contain bg-cb-video-bg z-20"
      />
    </div>

    <!-- 弾幕オーバーレイ -->
    <div
      ref="overlayEl"
      v-show="isCommentsEnabled"
      class="absolute inset-0 pointer-events-none overflow-hidden z-[70]"
    >
      <div
        ref="pinnedTopEl"
        class="absolute left-0 right-0 top-4 flex flex-col items-center gap-2.5 pointer-events-none z-[85]"
      />
      <div
        ref="pinnedBottomEl"
        class="absolute left-0 right-0 bottom-4 flex flex-col-reverse items-center gap-2.5 pointer-events-none z-[85]"
      />
    </div>

    <!-- ツールバー（ホバーで表示・下中央） -->
    <div
      class="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-2 items-center px-3.5 py-2.5 bg-cb-toolbar-bg rounded-[14px] transition-opacity duration-[160ms] z-[95] whitespace-nowrap"
      :style="{
        opacity: isToolbarVisible || !hasStream ? 1 : 0,
        pointerEvents: isToolbarVisible || !hasStream ? 'auto' : 'none',
      }"
    >
      <button
        v-if="!hasStream"
        type="button"
        class="border border-cb-toolbar-btn-border rounded-lg bg-cb-toolbar-btn-primary-bg text-cb-text-bright px-2.5 py-1.5 text-[0.8rem] cursor-pointer border-cb-primary"
        @click="startCapture"
      >
        キャプチャ開始
      </button>
      <button
        v-else
        type="button"
        class="border border-cb-toolbar-btn-border rounded-lg bg-cb-toolbar-btn-bg text-cb-text-bright px-2.5 py-1.5 text-[0.8rem] cursor-pointer"
        @click="stopCapture"
      >
        停止
      </button>

      <div class="w-px h-6 bg-cb-toolbar-divider" />

      <label class="flex items-center gap-1">
        <span class="text-xs text-cb-text-dim">文字</span>
        <input
          v-model.number="config.fontSize"
          type="range"
          min="10"
          max="100"
          step="2"
          class="w-[70px] accent-cb-accent"
          @input="sendConfig"
        />
        <span class="text-xs text-cb-text-bright min-w-[30px]"
          >{{ config.fontSize }}px</span
        >
      </label>
      <label class="flex items-center gap-1">
        <span class="text-xs text-cb-text-dim">速度</span>
        <input
          v-model.number="config.durationSec"
          type="range"
          min="2"
          max="8"
          step="0.5"
          class="w-[70px] accent-cb-accent"
          @input="sendConfig"
        />
        <span class="text-xs text-cb-text-bright min-w-[30px]"
          >{{ config.durationSec.toFixed(1) }}s</span
        >
      </label>
      <label class="flex items-center gap-1">
        <span class="text-xs text-cb-text-dim">固定</span>
        <input
          v-model.number="config.pinDurationSec"
          type="range"
          min="2"
          max="10"
          step="1"
          class="w-[70px] accent-cb-accent"
          @input="sendConfig"
        />
        <span class="text-xs text-cb-text-bright min-w-[30px]"
          >{{ config.pinDurationSec }}s</span
        >
      </label>

      <div class="w-px h-6 bg-cb-toolbar-divider" />

      <button
        type="button"
        class="border rounded-lg text-cb-text-bright px-2.5 py-1.5 text-[0.8rem] cursor-pointer"
        :class="
          isCommentsEnabled
            ? 'border-cb-accent bg-cb-toolbar-btn-active-bg'
            : 'border-cb-toolbar-btn-border bg-cb-toolbar-btn-bg'
        "
        @click="isCommentsEnabled = !isCommentsEnabled"
      >
        コメント {{ isCommentsEnabled ? "OFF" : "ON" }}
      </button>
      <button
        type="button"
        class="border border-cb-toolbar-btn-border rounded-lg bg-cb-toolbar-btn-bg text-cb-text-bright px-2.5 py-1.5 text-[0.8rem] cursor-pointer"
        @click="cycleCommentArea"
      >
        {{ commentAreaLabel }}
      </button>

      <div class="w-px h-6 bg-cb-toolbar-divider" />

      <button
        type="button"
        class="border rounded-lg text-cb-text-bright px-2.5 py-1.5 text-[0.8rem] cursor-pointer"
        :class="
          config.isForceColor
            ? 'border-cb-accent bg-cb-toolbar-btn-active-bg'
            : 'border-cb-toolbar-btn-border bg-cb-toolbar-btn-bg'
        "
        @click="toggleForceColor"
      >
        色強制
      </button>
      <input
        v-model="config.forcedColor"
        type="color"
        title="強制カラー"
        class="w-10 h-9 rounded-md cursor-pointer flex-shrink-0 bg-cb-surface-2 border border-cb-border p-0.5"
        @change="sendConfig"
      />

      <div class="w-px h-6 bg-cb-toolbar-divider" />

      <button
        type="button"
        class="border rounded-lg px-2.5 py-1.5 text-[0.8rem] cursor-pointer border-cb-toolbar-btn-border bg-cb-toolbar-btn-bg text-cb-text-bright disabled:opacity-40 disabled:cursor-not-allowed disabled:border-cb-toolbar-btn-disabled-border disabled:bg-cb-toolbar-btn-disabled-bg disabled:text-cb-text-muted"
        :disabled="hasStream"
        @click="router.push('/')"
      >
        Homeに戻る
      </button>
    </div>
  </div>
</template>
