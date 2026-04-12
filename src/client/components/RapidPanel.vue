<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import BaseToggleButton from "./BaseToggleButton.vue";
import { useLocalStorage } from "../composables/useLocalStorage";
import type { PostCommentParams } from "../api/client";
import type { CommentSize, PinPosition, RapidStock } from "../../shared/types";
import { SIZES, PINS } from "../constants/commentOptions";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

const emit = defineEmits<{
  send: [params: Omit<PostCommentParams, "author">];
}>();

const isVisible = ref(false);
const konamiBuffer: string[] = [];

const stocks = useLocalStorage("chatbullet_rapid_stocks");
const newLabel = ref("");
const newText = ref("");
const newColor = ref("#ffffff");
const newSize = ref<CommentSize>("medium");
const newPin = ref<PinPosition>(null);

function sendStock(stock: RapidStock) {
  emit("send", {
    text: stock.text,
    color: stock.color,
    size: stock.size,
    pinPosition: stock.pin,
  });
}

function addStock() {
  const label = newLabel.value.trim();
  const text = newText.value.trim();
  if (!label || !text) {
    return;
  }
  stocks.value = [
    ...(stocks.value ?? []),
    {
      label,
      text,
      color: newColor.value,
      size: newSize.value,
      pin: newPin.value,
    },
  ];
  newLabel.value = "";
  newText.value = "";
}

function deleteStock(index: number) {
  stocks.value = (stocks.value ?? []).filter(
    (_, stockIndex) => stockIndex !== index,
  );
}

function onKeydown(e: KeyboardEvent) {
  konamiBuffer.push(e.key);
  if (konamiBuffer.length > KONAMI.length) {
    konamiBuffer.shift();
  }
  if (
    konamiBuffer.length === KONAMI.length &&
    konamiBuffer.every((k, i) => k === KONAMI[i])
  ) {
    isVisible.value = !isVisible.value;
    konamiBuffer.length = 0;
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div v-show="isVisible" class="rapid-panel flex flex-col gap-2 p-3">
    <!-- 登録済みストック -->
    <div class="flex flex-wrap gap-1.5 items-center">
      <div
        v-for="(stock, i) in stocks"
        :key="i"
        class="relative inline-flex items-center"
      >
        <button
          type="button"
          class="rapid-stock-btn rounded pr-5 pl-2 py-0.5 text-xs cursor-pointer"
          :style="{ color: stock.color }"
          @click="sendStock(stock)"
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

    <!-- 新規追加フォーム -->
    <div class="flex flex-wrap gap-1.5 items-center">
      <input
        v-model="newLabel"
        type="text"
        placeholder="ラベル"
        maxlength="10"
        class="rapid-label-input rounded px-2 py-1 text-xs"
      />
      <input
        v-model="newText"
        type="text"
        placeholder="送信テキスト"
        maxlength="250"
        class="rapid-text-input flex-1 min-w-20 rounded px-2 py-1 text-xs"
      />
      <input
        v-model="newColor"
        type="color"
        class="color-picker-sm w-8 h-7 rounded cursor-pointer"
      />
      <BaseToggleButton
        v-for="s in SIZES"
        :key="s.value"
        :active="newSize === s.value"
        active-style="background:#3b82f6;border:1px solid #3b82f6;color:#fff"
        inactive-style="background:#2a2a2a;border:1px solid #3a3a3a;color:#aaa"
        @click="newSize = s.value"
        >{{ s.label }}</BaseToggleButton
      >
      <BaseToggleButton
        v-for="p in PINS"
        :key="String(p.value)"
        :active="newPin === p.value"
        active-style="background:#3b82f6;border:1px solid #3b82f6;color:#fff"
        inactive-style="background:#2a2a2a;border:1px solid #3a3a3a;color:#aaa"
        @click="newPin = p.value"
        >{{ p.label }}</BaseToggleButton
      >
      <button
        type="button"
        class="btn-add rounded-md px-3 py-1 text-sm cursor-pointer"
        @click="addStock"
      >
        ＋追加
      </button>
    </div>
  </div>
</template>

<style scoped>
.rapid-panel {
  background: var(--color-bg);
  border-top: 1px solid var(--color-surface-2);
}

.rapid-stock-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.rapid-delete-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
}

.rapid-label-input {
  width: 70px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.rapid-text-input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.color-picker-sm {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  padding: 1px;
}

.btn-add {
  background: var(--color-surface-dark);
  color: var(--color-text);
  border: none;
}
</style>
