<script setup lang="ts">
import { ref, computed } from "vue";
import { useLocalStorage } from "../composables/useLocalStorage";

const authorStorage = useLocalStorage("chatbullet_author");

const authorInput = ref(authorStorage.value ?? "");
const isEditing = ref(!authorStorage.value);
const hasAuthor = computed(() => (authorStorage.value ?? "").trim().length > 0);

function confirmAuthor() {
  const trimmedValue = authorInput.value.trim();
  if (!trimmedValue) {
    return;
  }
  authorStorage.value = trimmedValue;
  isEditing.value = false;
}

function editAuthor() {
  authorInput.value = authorStorage.value ?? "";
  isEditing.value = true;
}
</script>

<template>
  <div
    class="h-full bg-cb-bg-deep flex flex-col items-center justify-start pt-24 p-6"
  >
    <div class="w-full max-w-2xl">
      <h1 class="text-4xl font-bold text-cb-text-bright">Chat Bullet</h1>
      <p class="mt-2 text-cb-text-dim">LAN内動作 弾幕ツール</p>

      <!-- 名前入力 -->
      <div class="mt-8 flex items-center gap-3">
        <div v-if="isEditing" class="flex items-center gap-2">
          <input
            id="author-input"
            v-model="authorInput"
            type="text"
            placeholder="名前を入力（必須）"
            maxlength="25"
            class="rounded-lg px-3 py-2 w-[220px] bg-cb-surface-2 border border-cb-border-strong text-cb-text-bright text-[0.95rem] focus:outline-none focus:border-cb-accent placeholder:text-cb-text-muted"
            @keyup.enter="confirmAuthor"
          />
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-xs cursor-pointer bg-cb-accent text-cb-text-bright border-0"
            @click="confirmAuthor"
          >
            確定
          </button>
        </div>
        <div v-else class="flex items-center gap-2">
          <span class="text-[1.2rem] font-semibold text-cb-text-bright">{{ authorStorage }}</span>
          <button
            type="button"
            class="bg-transparent border-0 cursor-pointer text-[0.85rem] text-cb-text-muted hover:text-cb-text-dim"
            @click="editAuthor"
            aria-label="編集"
          >
            ✎
          </button>
        </div>
      </div>

      <section class="mt-8 grid gap-4 md:grid-cols-2">
        <RouterLink
          v-if="hasAuthor"
          to="/chat"
          class="rounded-2xl border border-cb-border-strong bg-cb-surface-dark/80 p-6 hover:border-cb-highlight"
        >
          <h2 class="text-2xl font-semibold text-cb-text-bright">Chat</h2>
          <p class="mt-2 text-cb-text-dim">
            チャット用ページ - チャット送信＋チャットログ
          </p>
        </RouterLink>
        <RouterLink
          v-if="hasAuthor"
          to="/view"
          class="rounded-2xl border border-cb-border-strong bg-cb-surface-dark/80 p-6 hover:border-cb-highlight"
        >
          <h2 class="text-2xl font-semibold text-cb-text-bright">View</h2>
          <p class="mt-2 text-cb-text-dim">
            配信用ページ - 画面キャプチャ＋弾幕
          </p>
        </RouterLink>
      </section>
    </div>
  </div>
</template>
