# Chat Bullet — アーキテクチャ解説

> LT 発表用資料 / 2026-04

---

## 何を作ったか

**LAN 内で動く弾幕オーバーレイシステム。**

発表者が画面共有を開始すると、参加者がブラウザからコメントを送信し、共有画面の上にニコニコ動画のような弾幕として重ねて表示される。  
Zoom や Teams に頼らず、**自社サーバ 1 台 + ブラウザだけ**で完結する。

```
参加者 (Chat)          発表者 (Share)
    ↓ コメント送信          ↓ 画面共有開始
         ↓                      ↓
    ┌─────────────── サーバ ───────────────┐
    │  Express  +  WebSocket  +  WebRTC  │
    └──────────────────────────────────────┘
                    ↓ 映像 + 弾幕
             プロジェクター (View)
```

---

## ディレクトリ構成

```
chat-bullet-web/
├── src/
│   ├── shared/
│   │   └── types.ts          ← ★ サーバ・クライアント共通型
│   └── web/
│       ├── server.ts         ← Express + WebSocket + WebRTC シグナリング
│       └── client/
│           ├── api/
│           │   └── client.ts         ← 型付き REST クライアント
│           ├── composables/
│           │   ├── useWebSocket.ts   ← WS 接続管理
│           │   └── useWebRTC.ts      ← RTC 送受信ロジック
│           └── pages/
│               ├── HomePage.vue      ← ポータル（リンク集）
│               ├── ChatPage.vue      ← コメント送受信
│               ├── SharePage.vue     ← 画面共有 + 設定スライダー
│               └── ViewPage.vue      ← 弾幕オーバーレイ（フルスクリーン）
├── vite.config.ts
└── tsconfig.server.json
```

---

## 技術スタック

| 層             | 技術                                                |
| -------------- | --------------------------------------------------- |
| フロントエンド | Vue 3 (Composition API) + TypeScript + Tailwind CSS |
| ビルド         | Vite 5 (dev: HMR付きミドルウェアモード)             |
| バックエンド   | Node.js + Express 5                                 |
| リアルタイム   | WebSocket (`ws` ライブラリ)                         |
| 映像転送       | WebRTC (`RTCPeerConnection`)                        |
| 永続化         | JSON ファイル (セッション単位)                      |

---

## データフロー

### コメントが弾幕になるまで

```
ChatPage                    Server                   ViewPage
   │                           │                        │
   │── POST /api/comments ────→│                        │
   │                           │── broadcast(bullet) ──→│
   │←── WS bullet ────────────│                        │
   │                           │                  addFlowComment()
   │                           │               CSS アニメーションで流れる
```

1. `POST /api/comments` でサーバに送信
2. サーバが全 WebSocket クライアントに `{ type: "bullet", comment }` を broadcast
3. ViewPage が受信し、CSS `@keyframes` アニメーションで DOM に流す

### 画面共有の仕組み (WebRTC)

```
SharePage                   Server                    ViewPage
   │                           │                        │
   │── WS connect (role=share)→│                        │
   │                           │←── WS connect (view) ──│
   │                           │                        │
   │                           │── new-viewer ─────────→│ (shareへ通知)
   │←── new-viewer ────────────│                        │
   │                           │                        │
   │─ offer ──────────────────→│── offer ──────────────→│
   │←── answer ────────────────│←── answer ─────────────│
   │─ ICE candidate ──────────→│── ICE candidate ───────→│
   │                           │                        │
   ╔═══════════════════════════════════════════════════╗
   ║    P2P 映像ストリーム確立（サーバ経由なし）        ║
   ╚═══════════════════════════════════════════════════╝
```

WebRTC はシグナリング（offer/answer/ICE の交換）だけサーバを経由し、  
**映像データは P2P で直接転送**される。サーバの帯域を消費しない。

---

## 設計上のポイント

### ① shared/types.ts — 型をサーバとクライアントで共有

```typescript
// src/shared/types.ts
export type CommentPayload = { id: string; author: string; text: string; ... }
export type WsMessage =
  | { type: "bullet"; comment: CommentPayload }
  | { type: "config"; config: Partial<ConfigPayload> }
  | { type: "offer"; viewerId: string; offer: unknown }
  | ...
```

サーバとクライアントが同じ型を import する。  
**WebSocket のメッセージ形式が変わったら、型エラーで両側が壊れる**ため、プロトコルの乖離を防ぐ。

---

### ② WebSocket に 2 種類の role がある理由

SharePage は WebSocket を **2 本**張っている。

```typescript
useWebSocket("comment"); // コメント受信用
useWebSocket("share"); // WebRTC シグナリング専用
```

**なぜ分けるか？**

サーバは `role=share` の接続を「映像送信者」として記憶し、  
新しい視聴者が来たときに offer を作るよう通知する必要がある。  
コメント用 WS と混在すると、サーバが「誰が映像送信者か」を判別できなくなる。

```typescript
// server.ts
if (role === "share") {
  screenSender = ws; // ← この1本だけ特別扱い
}
```

**意図的な冗長性**であり、役割の明確化のための分離。

---

### ③ useWebSocket composable — 再接続を自動化

```typescript
export function useWebSocket(role: string) {
  function connect() {
    ws = new WebSocket(`...?role=${role}`);
    ws.addEventListener("close", () => {
      if (!destroyed) setTimeout(connect, 3000); // 3秒後に自動再接続
    });
  }
  onUnmounted(() => {
    destroyed = true;
    ws?.close();
  }); // コンポーネント破棄で切断
  connect();
  return { connected, send, onMessage };
}
```

- コンポーネントが生きている間は切断しても自動で繋ぎ直す
- コンポーネントが破棄されたら `destroyed` フラグで再接続ループを止める
- `onMessage` で型安全なハンドラを登録できる

---

### ④ ViewPage — DOM 直操作で弾幕アニメーション

Vue の reactivity を**使わない**選択をした箇所がある。

```typescript
// Vue の v-for ではなく、直接 DOM に appendChild する
function addFlowComment(comment: CommentPayload) {
  const el = document.createElement("div");
  el.style.animation = `cb-scroll-left ${config.durationSec}s linear forwards`;
  overlayEl.value?.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true }); // 自動削除
}
```

**理由**: 弾幕は「流れて消える」使い捨て要素。  
Vue の仮想 DOM で管理すると、流れ終わった要素の削除タイミングを制御しにくく、  
また大量のコメントが来たとき reactivity のオーバーヘッドが無視できなくなる。  
アニメーション完了イベント (`animationend`) で自分自身を消す、シンプルな方針を選択。

---

### ⑤ 永続化はファイル JSON — DB を持たない

```typescript
// サーバ起動時にセッションファイルを1つ作成
const sessionFile = `web-data/comments-${timestamp}.json`;
```

- 起動のたびに新しいファイル → **セッション単位で履歴が自動保存**
- DB のセットアップ不要、`cat web-data/xxx.json` で中身を確認できる
- イベント用途（1日数時間の使用）なのでスケーラビリティは不要

---

### ⑥ Vite を Express のミドルウェアとして組み込む

```typescript
// server.ts (開発時)
const serverInstance = await createViteServer({
  server: { middlewareMode: true },
});
app.use(serverInstance.middlewares); // Express に Vite の HMR を乗せる
```

開発中は Express サーバ 1 本で  
「API + WebSocket + Vue の HMR（ホットリロード）」が全部動く。  
ポート番号の混乱がなく、WebSocket の接続先も常に同じ。

---

## ルーティングとレイアウト

| パス     | 用途              | レイアウト                   |
| -------- | ----------------- | ---------------------------- |
| `/`      | Portal (リンク集) | ナビあり、中央寄せ           |
| `/chat`  | コメント送受信    | ナビあり、**全高フレックス** |
| `/share` | 画面共有 + 設定   | ナビあり、**全高フレックス** |
| `/view`  | 弾幕オーバーレイ  | **ナビなし、フルスクリーン** |

`/view` は `meta: { fullscreen: true }` でナビバーごと非表示にし、  
`height: 100vh` の完全なキャンバスにする。

---

## 今後の改善余地

- **認証なし** — 現状 LAN 内信頼前提。URL を知っていれば誰でも管理操作できる
- **メモリ内コメント配列** — サーバ再起動で消える（ファイルには残る）
- **1対多の WebRTC** — Share → View は現状 1 送信者のみ想定
- **コメント ID が UUID** — クライアント側で重複チェックをしていない（WS と REST で二重受信しないよう注意）
