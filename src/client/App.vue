<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <!-- ViewPage: フルスクリーン、ナビなし -->
  <RouterView v-if="route.meta.fullscreen" />

  <!-- その他ページ: ヘッダー + コンテンツエリア -->
  <div v-else class="h-screen flex flex-col bg-cb-bg-deep text-cb-text-bright">
    <header
      class="flex-shrink-0 border-b border-cb-border bg-cb-surface-dark/80 px-6 py-4"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between">
        <h1 class="text-xl font-semibold">Chat Bullet</h1>
        <nav class="flex flex-wrap gap-3">
          <RouterLink
            class="rounded-full border border-cb-border px-4 py-2 text-sm text-cb-text-bright hover:border-cb-highlight"
            to="/"
          >
            Home
          </RouterLink>
        </nav>
      </div>
    </header>

    <!-- fullHeight: ページが自身で高さを管理する (Chat) -->
    <main v-if="route.meta.fullHeight" class="flex-1 min-h-0">
      <RouterView class="h-full" />
    </main>

    <!-- 通常ページ -->
    <main v-else class="flex-1 min-h-0">
      <RouterView class="h-full" />
    </main>
  </div>
</template>
