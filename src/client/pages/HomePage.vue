<script setup lang="ts">
import { ref, computed } from "vue";
import { useLocalStorage } from "../composables/useLocalStorage";

const authorStorage = useLocalStorage("chatbullet_author");

const authorInput = ref(authorStorage.value ?? "");
const isEditing = ref(!authorStorage.value);
const hasAuthor = computed(() => (authorStorage.value ?? "").trim().length > 0);

function confirmAuthor() {
  const v = authorInput.value.trim();
  if (!v) return;
  authorStorage.value = v;
  isEditing.value = false;
}

function editAuthor() {
  authorInput.value = authorStorage.value ?? "";
  isEditing.value = true;
}
</script>

<template>
  <div
    class="h-full bg-[#0d1117] flex flex-col items-center justify-start pt-24 p-6"
  >
    <div class="w-full max-w-2xl">
      <h1 class="text-4xl font-bold text-white">Chat Bullet</h1>
      <p class="mt-2 text-slate-400">LAN内動作 弾幕ツール</p>

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
          class="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 hover:border-violet-500"
        >
          <h2 class="text-2xl font-semibold text-white">Chat</h2>
          <p class="mt-2 text-slate-400">
            チャット用ページ - チャット送信＋チャットログ
          </p>
        </RouterLink>
        <RouterLink
          v-if="hasAuthor"
          to="/view"
          class="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 hover:border-violet-500"
        >
          <h2 class="text-2xl font-semibold text-white">View</h2>
          <p class="mt-2 text-slate-400">配信用ページ - 画面キャプチャ＋弾幕</p>
        </RouterLink>
      </section>
    </div>
  </div>
</template>

<style scoped>

.author-input {
  background: #1e293b;
  border: 1px solid #334155;
  color: #f1f5f9;
  font-size: 0.95rem;
  width: 220px;
}

.author-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.author-input::placeholder {
  color: #64748b;
}

.author-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #f1f5f9;
}

.btn-confirm {
  background: #3b82f6;
  color: #fff;
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
  color: #475569;
}

.btn-edit:hover {
  color: #94a3b8;
}
</style>
