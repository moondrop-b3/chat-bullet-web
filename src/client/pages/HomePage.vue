<script setup lang="ts"></script>

<template>
  <div class="min-h-screen bg-slate-950 text-white">
    <div class="mx-auto max-w-4xl p-8">
      <h1 class="text-5xl font-bold">Chat Bullet</h1>
      <p class="mt-4 text-slate-300">Vue SPA で公開画面を管理します。</p>
      <section class="mt-10 grid gap-4 md:grid-cols-2">
        <RouterLink
          to="/chat"
          class="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 hover:border-violet-500"
        >
          <h2 class="text-2xl font-semibold text-white">Chat</h2>
          <p class="mt-2 text-slate-400">チャットログ表示ページ。</p>
        </RouterLink>
        <RouterLink
          to="/share"
          class="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 hover:border-violet-500"
        >
          <h2 class="text-2xl font-semibold text-white">Share</h2>
          <p class="mt-2 text-slate-400">画面共有ページ。</p>
        </RouterLink>
        <RouterLink
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
