<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useWebSocket } from "../composables/useWebSocket";
import { useCommentLog } from "../composables/useCommentLog";
import { useCommentForm } from "../composables/useCommentForm";
import { getComments } from "../api/client";
import type { CommentPayload } from "../../shared/types";
import CommentFormFooter from "../components/CommentFormFooter.vue";

const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
const RAPID_KEY = "chatbullet_rapid_stocks";

type RapidStock = {
  label: string;
  text: string;
  color: string;
  size: "small" | "medium" | "large";
  pin: "top" | "bottom" | null;
};

const commentLog = useCommentLog();
const { comments, newCount, formatTime, scrollToBottom, onScroll, appendComment } = commentLog;
const { sendComment } = useCommentForm();

const forceColor = ref(false);
const rapidPanelVisible = ref(false);
const rapidStocks = ref<RapidStock[]>(loadStocks());
const rapidLabel = ref("");
const rapidText = ref("");
const rapidColor = ref("#ffffff");
const kBuf: string[] = [];

function detectKonami(e: KeyboardEvent) {
  kBuf.push(e.key);
  if (kBuf.length > KONAMI.length) kBuf.shift();
  if (kBuf.length === KONAMI.length && kBuf.every((k, i) => k === KONAMI[i])) {
    rapidPanelVisible.value = !rapidPanelVisible.value;
    kBuf.length = 0;
  }
}

function loadStocks(): RapidStock[] {
  try {
    return JSON.parse(localStorage.getItem(RAPID_KEY) ?? "[]") as RapidStock[];
  } catch {
    return [];
  }
}

function saveStocks() {
  localStorage.setItem(RAPID_KEY, JSON.stringify(rapidStocks.value));
}

async function sendRapid(stock: RapidStock) {
  await sendComment({
    text: stock.text,
    color: stock.color,
    size: stock.size,
    pinPosition: stock.pin,
  });
}

function addRapidStock() {
  const label = rapidLabel.value.trim();
  const t = rapidText.value.trim();
  if (!label || !t) return;
  rapidStocks.value.push({ label, text: t, color: rapidColor.value, size: "medium", pin: null });
  saveStocks();
  rapidLabel.value = "";
  rapidText.value = "";
}

function deleteStock(i: number) {
  rapidStocks.value.splice(i, 1);
  saveStocks();
}

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

    <CommentFormFooter
      :new-count="newCount"
      @send="sendComment"
      @scroll-to-bottom="scrollToBottom"
      @text-keydown="detectKonami"
    >
      <div v-if="forceColor" class="force-color-warn text-xs">
        ⚠ 管理者が文字色を強制中
      </div>
    </CommentFormFooter>

    <!-- 早撃ちパネル（コナミコマンドで表示） -->
    <div v-show="rapidPanelVisible" class="rapid-panel flex flex-col gap-2 p-3">
      <div class="flex flex-wrap gap-1.5 items-center">
        <div
          v-for="(stock, i) in rapidStocks"
          :key="i"
          class="relative inline-flex items-center"
        >
          <button
            type="button"
            class="rapid-stock-btn rounded-md pr-6 pl-2.5 py-1.5 text-sm cursor-pointer"
            :style="{ color: stock.color }"
            @click="sendRapid(stock)"
          >
            {{ stock.label }}
          </button>
          <button
            type="button"
            class="rapid-delete-btn absolute right-0.5 top-1/2 -translate-y-1/2 px-0.5 text-xs leading-none cursor-pointer"
            @click="deleteStock(i)"
          >
            ×
          </button>
        </div>
      </div>
      <div class="flex flex-wrap gap-1.5 items-center">
        <input
          v-model="rapidLabel"
          type="text"
          placeholder="ラベル"
          maxlength="10"
          class="rapid-label-input rounded px-2 py-1 text-xs"
        />
        <input
          v-model="rapidText"
          type="text"
          placeholder="送信テキスト"
          maxlength="250"
          class="rapid-text-input flex-1 min-w-20 rounded px-2 py-1 text-xs"
        />
        <input
          v-model="rapidColor"
          type="color"
          class="color-picker-sm w-8 h-7 rounded cursor-pointer"
        />
        <button
          type="button"
          class="btn-add rounded-md px-3 py-1 text-sm cursor-pointer"
          @click="addRapidStock"
        >
          ＋追加
        </button>
      </div>
    </div>
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

.rapid-panel {
  background: #111;
  border-top: 1px solid #2a2a2a;
}

.rapid-stock-btn {
  background: #1e1e1e;
  border: 1px solid #3a3a3a;
}

.rapid-delete-btn {
  background: none;
  border: none;
  color: #666;
}

.rapid-label-input {
  width: 70px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  color: #eee;
}

.rapid-text-input {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  color: #eee;
}

.color-picker-sm {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  padding: 1px;
}

.btn-add {
  background: #374151;
  color: #eee;
  border: none;
}
</style>
