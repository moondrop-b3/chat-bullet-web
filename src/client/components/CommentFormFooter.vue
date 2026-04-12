<script setup lang="ts">
import { ref } from "vue";
import { useLocalStorage } from "../composables/useLocalStorage";
import BaseToggleButton from "./BaseToggleButton.vue";
import type { PostCommentParams } from "../api/client";
import { SIZES, PINS } from "../constants/commentOptions";
import type { CommentSize, PinPosition } from "../../shared/types";

const text = ref("");
const size = ref<CommentSize>("medium");
const pinPosition = ref<PinPosition>(null);
const DEFAULT_COLOR = "#ffffff";
const color = useLocalStorage("chatbullet_color");

if (color.value === null) {
  color.value = DEFAULT_COLOR;
}

defineProps<{
  newCount: number;
}>();

const emit = defineEmits<{
  send: [params: Omit<PostCommentParams, "author">];
  scrollToBottom: [];
  textKeydown: [e: KeyboardEvent];
}>();

function handleSend() {
  const trimmedText = text.value.trim();
  if (!trimmedText) {
    return;
  }
  emit("send", {
    text: trimmedText,
    color: color.value ?? "#ffffff",
    size: size.value,
    pinPosition: pinPosition.value,
  });
  text.value = "";
}
</script>

<template>
  <footer class="relative flex flex-col gap-2 p-3 bg-cb-surface border-t border-cb-surface-2 flex-shrink-0">
    <!-- 新着バナー -->
    <div
      v-if="newCount > 0"
      class="cb-new-banner absolute z-20 cursor-pointer select-none rounded-full px-4 py-1 text-xs font-bold text-cb-text-bright"
      @click="emit('scrollToBottom')"
    >
      ↓ {{ newCount }}件の新着
    </div>

    <!-- コメント -->
    <div class="flex gap-1.5">
      <input
        v-model="text"
        type="text"
        placeholder="コメント（必須）"
        maxlength="250"
        autocomplete="off"
        class="flex-1 min-w-0 rounded-md px-2.5 py-2 text-sm bg-cb-surface-2 border border-cb-border text-cb-text"
        @keydown.enter.prevent="handleSend"
        @keydown="emit('textKeydown', $event)"
      />
      <input
        v-model="color"
        type="color"
        title="文字色"
        class="w-10 h-9 rounded-md cursor-pointer flex-shrink-0 bg-cb-surface-2 border border-cb-border p-0.5"
      />
      <button
        type="button"
        class="rounded-md px-3.5 py-2 text-sm font-bold flex-shrink-0 cursor-pointer text-cb-text-bright bg-cb-primary border-0"
        @click="handleSend"
      >
        送信
      </button>
    </div>

    <!-- サイズ・位置 -->
    <div class="flex flex-wrap gap-2 items-center">
      <span class="cb-label-muted text-xs">サイズ:</span>
      <BaseToggleButton
        v-for="s in SIZES"
        :key="s.value"
        :active="size === s.value"
        @click="size = s.value"
        >{{ s.label }}</BaseToggleButton
      >
      <span class="cb-label-muted text-xs ml-2">位置:</span>
      <BaseToggleButton
        v-for="p in PINS"
        :key="String(p.value)"
        :active="pinPosition === p.value"
        @click="pinPosition = p.value"
        >{{ p.label }}</BaseToggleButton
      >
    </div>

    <!-- ページ固有コンテンツ -->
    <slot />
  </footer>
</template>
