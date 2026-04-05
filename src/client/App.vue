<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from "vue-router";
const route = useRoute();
</script>

<template>
  <!-- ViewPage: フルスクリーン、ナビなし -->
  <RouterView v-if="route.meta.fullscreen" />

  <!-- その他ページ: ヘッダー + コンテンツエリア -->
  <div v-else class="h-screen flex flex-col bg-slate-950 text-white">
    <header
      class="flex-shrink-0 border-b border-slate-800 bg-slate-900/80 px-6 py-4"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between">
        <h1 class="text-xl font-semibold">Chat Bullet</h1>
        <nav class="flex flex-wrap gap-3">
          <RouterLink
            class="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-violet-500"
            to="/"
            >Home</RouterLink
          >
          <RouterLink
            class="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-violet-500"
            to="/chat"
            >Chat</RouterLink
          >
          <RouterLink
            class="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-violet-500"
            to="/share"
            >Share</RouterLink
          >
          <RouterLink
            class="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-violet-500"
            to="/view"
            >View</RouterLink
          >
        </nav>
      </div>
    </header>

    <!-- fullHeight: ページが自身で高さを管理する (Chat / Share) -->
    <main v-if="route.meta.fullHeight" class="flex-1 min-h-0">
      <RouterView class="h-full" />
    </main>

    <!-- 通常ページ: スクロール可能なコンテナ -->
    <main v-else class="flex-1 overflow-auto">
      <div class="mx-auto max-w-6xl p-6">
        <RouterView />
      </div>
    </main>
  </div>
</template>
