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
            class="author-input rounded-lg px-3 py-2"
            @keyup.enter="confirmAuthor"
          />
          <button
            type="button"
            class="btn-confirm rounded px-3 py-1"
            @click="confirmAuthor"
          >
            確定
          </button>
        </div>
        <div v-else class="flex items-center gap-2">
          <span class="author-value">{{ authorStorage }}</span>
          <button
            type="button"
            class="btn-edit"
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

<style scoped>
.author-input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-bright);
  font-size: 0.95rem;
  width: 220px;
}

.author-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.author-input::placeholder {
  color: var(--color-text-muted);
}

.author-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-bright);
}

.btn-confirm {
  background: var(--color-accent);
  color: var(--color-text-bright);
  border: none;
  font-size: 0.8rem;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-edit {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.btn-edit:hover {
  color: var(--color-text-dim);
}
</style>
