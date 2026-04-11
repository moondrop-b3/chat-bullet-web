# コーディングルール

> `INSTRUCTIONS.md` が正のソース。ルールを変更する場合は `INSTRUCTIONS.md` を編集し、このファイルと `.github/copilot-instructions.md` に反映すること。

## TypeScript

- **`any` 禁止**: 外部 API レスポンスなど型が取得できない場合のみ許可。その場合は `unknown` を使い、コメントで理由を記載する
- **`as` による型強制禁止**: 型が確実に保証できる場合のみ許可。不確かな場合は型ガードや `satisfies` を使う
- **`as const satisfies Type`**: 定数配列・オブジェクトはリテラル型を保持しつつ型チェックするためにこの形を使う
- **`class`・`interface` 禁止**: `type` と関数で統一する
- **`==` 禁止**: 比較演算子は `===` のみ使用する
- **`import type` を使う**: 型のみのインポートは必ず `import type` を使う

## 命名

- **1文字の変数名禁止**: ループ変数（`i`、`k` 等）とイベントハンドラの引数（`e` 等）を除き、1文字の変数名は使わない
- **定数は `UPPER_SNAKE_CASE`**
- **`boolean` 変数は `is`/`has` プレフィックス**: 例: `isVisible`、`hasError`

## 条件分岐・制御フロー

- **インライン `if` 禁止**: 1行 `if` でもブロック `{}` を省略しない
- **三項演算子のネスト禁止**: 三項演算子を入れ子にしない。複雑な条件は `if/else` または早期 `return` で書く
- **early return を使う**: 深いネストを避け、条件を満たさない場合は早期 `return` する

## 関数・構造

- **`async/await` を使う**: `.then()` チェーンは使わない
- **副作用と純粋処理を分ける**: 副作用のある処理と値を返すだけの処理を混在させない
- **マジックナンバー禁止**: 意味のある数値は定数化する

## Vue

- **ファイルブロック順序**: `.vue` ファイルは `<script>` → `<template>` → `<style>` の順に記述する
- **自己閉じタグ**: 子要素・スロットがない場合は `<Component />` の形にする
- **コンポーネント名は PascalCase**: テンプレート内では `<RouterLink>` ○、`<router-link>` ✗
- **`v-model` は `defineModel` を使う**: 親子間の双方向バインディングは `defineProps` + `defineEmits` の組み合わせではなく `defineModel` で実装する
- **テンプレートの `ref="name"` は `useTemplateRef` を使う**: script 側で `const el = ref()` と書かず、必ず `useTemplateRef<ElementType>('name')` を使う
- **コンポーネント ref・`provide/inject` は代替手段を先に検討する**: イベントや props で解決できないか確認してから使う
- **静的インラインスタイル禁止**: `style="color: #fff"` は禁止。`<style scoped>` のクラスに移す。スクリプト変数を使う動的スタイルのみ `:style` バインディングを許可する

## スタイル

- **色は `index.css` の CSS 変数で定義し、Tailwind 経由で使う**:
  - 色の追加は `index.css` の `:root` に `--color-xxxx` で定義し、`tailwind.config.js` の `extend.colors` に `cb-xxxx` として登録する
  - テンプレートでは `bg-cb-bg`・`text-cb-text` 等の `cb-` プレフィックスのクラスで参照する
  - `text-slate-400`・`bg-green-500`・`bg-[#111]` 等、`cb-` 以外の色クラスは使わない

## 設計

- **`localStorage` は `useLocalStorage` 経由のみ**: 直接 `localStorage.getItem/setItem` を呼ばない
- **型・定数の共通化**: 複数箇所で使う型は `src/shared/types.ts`、定数は `src/client/constants/` に切り出す
