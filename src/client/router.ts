import { createRouter, createWebHistory } from "vue-router";
import HomePage from "./pages/HomePage.vue";
import ChatPage from "./pages/ChatPage.vue";
import ViewPage from "./pages/ViewPage.vue";

const routes = [
  { path: "/", name: "Home", component: HomePage },
  { path: "/chat", name: "Chat", component: ChatPage, meta: { fullHeight: true } },
  { path: "/view", name: "View", component: ViewPage, meta: { fullscreen: true } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
