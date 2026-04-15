# chat-bullet-web

LAN内動作のブラウザ弾幕チャットアプリ。画面キャプチャにリアルタイムで弾幕コメントを合成表示できる。

## ページ

| パス    | 説明                               |
| ------- | ---------------------------------- |
| `/`     | ホーム・表示名の設定               |
| `/chat` | コメント送信・ログ                 |
| `/view` | 画面キャプチャ＋弾幕合成（配信用） |

## 起動

```bash
npm install
npm run build
npm run start
```

起動後、ターミナルに表示される URL へアクセス（初回は自己署名証明書の警告を許可）。

ポートを変更する場合（デフォルト: 3001）:

```bash
PORT=3002 npm run start
```

## 技術スタック

- Vue 3 + TypeScript + Tailwind CSS
- Express + WebSocket + SQLite
- Vite
