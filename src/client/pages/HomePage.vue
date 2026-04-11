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
    class="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-6"
  >
    <div class="w-full max-w-2xl">
      <h1 class="text-4xl font-bold text-white">Chat Bullet</h1>
      <p class="mt-2 text-slate-400">弾幕チャット + 画面共有</p>

      <!-- 名前入力 -->
      <div class="mt-8 flex items-center gap-3">
        <label
          for="author-input"
          class="text-sm text-slate-400 whitespace-nowrap"
          >表示名</label
        >
        <div v-if="isEditing" class="flex items-center gap-2">
          <input
            id="author-input"
            v-model="authorInput"
            type="text"
            placeholder="名前を入力（必須）"
            maxlength="25"
            class="author-input rounded-lg px-3 py-2 text-sm"
            @keyup.enter="confirmAuthor"
          />
          <button
            type="button"
            class="btn-confirm rounded px-3 py-1 text-sm"
            @click="confirmAuthor"
          >
            確定
          </button>
        </div>
        <div v-else class="flex items-center gap-2">
          <span class="author-text text-white font-bold">{{
            authorStorage
          }}</span>
          <button
            type="button"
            class="btn-edit text-slate-400 hover:text-white"
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
          <p class="mt-2 text-slate-400">チャットログ表示ページ。</p>
        </RouterLink>
        <RouterLink
          v-if="hasAuthor"
          to="/admin"
          class="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 hover:border-violet-500"
        >
          <h2 class="text-2xl font-semibold text-white">Admin</h2>
          <p class="mt-2 text-slate-400">管理・設定ページ。</p>
        </RouterLink>
        <RouterLink
          v-if="hasAuthor"
          to="/view"
          class="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 hover:border-violet-500"
        >
          <h2 class="text-2xl font-semibold text-white">View</h2>
          <p class="mt-2 text-slate-400">共有画面の受信・表示。</p>
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
  width: 220px;
}

.author-input::placeholder {
  color: #64748b;
}

.btn-confirm {
  background: #3b82f6;
  color: #fff;
  border: none;
}

.btn-edit {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}
</style>
