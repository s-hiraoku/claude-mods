---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# レビュー指摘から学んだ書き方の規約

人間の PR レビュー指摘から `/improve-review-pr --batch` が蒸留した、repo を問わない書き方の落とし穴。
レビュー時の確認観点は `skills/review-pr/references/extra-perspectives.md` 側（ここには書かない）。

## state・非同期

- 常時マウントで閉時 `display:none` にするモーダル / ドロップダウンは、開くたびに内部 state（検索文字列・初期値）を初期化する（`isOpen` で reset するか `key` でリマウント）。表示 status は `ready` へ前進のみにして、閉じアニメーション中に loading へ後退させない — 由来: @murakami-shin_101 mobile-ui#101, mobile-ui#141, mobile-ui#64, misc-ui-v2#87
- 一覧の選択 state（`selectedIds` 等）はページ・フィルタ・ソート変更時にリセットする（「N 件選択中」ヘッダが残る） — 由来: @taki-akinori_101 mobile-ui#149
- 非同期処理（fetch / debounce）をまたいで state を更新するときは、呼び出し時点のスナップショットで全置換しない: 関数形 `setState(prev => …)` で差分を適用し、in-flight ガードか世代トークンで古い応答を捨てる。debounce の発火時は最新値を ref から読む — 由来: @murakami-shin_101 mail-ui#177, misc-ui-v2#118, misc-ui-v2#138
- データ取得 hook の引数（page・size・sort …）はすべてキャッシュキー（SWR key / queryKey）に入れる。非対称だと stale ページが返る — 由来: @murakami-shin_101 misc-ui-v2#104

## 入力・パース

- URL パラメータや入力欄の数値は `Number()` 素通しにしない（`1e1` / `0x3` / `12a` が通り、NaN が state に入ると controlled input が壊れる）。整数文字列の正規表現 + `Number.isSafeInteger` + 範囲で検証し、NaN は空にフォールバックする — 由来: @murakami-shin_101 misc-ui-v2#138, misc-ui-v2#77, mobile-ui#72
- 送信目的でない `<button>` は `type="button"` を明示する — 由来: @taki-akinori_101 mail-ui#20, mail-ui#18

## CSS / Tailwind

- Tailwind の `group-hover:` / `peer-*:` は祖先に `group` / 兄弟に `peer` が無いと無反応。無ければ `hover:` を使う — 由来: @taki-akinori_101 mobile-ui#151
- flex 子要素に長文が入る欄は `min-w-0`、長い英数字は `break-all`（隣の欄を押し出す・折り返せない） — 由来: @murakami-shin_101 mobile-ui#157, misc-ui-v2#119

## Next.js (Server / Client 境界)

- `server-only` を含むモジュールを、client component からも読まれるバレル `index.ts` で同居 export しない（`'server-only' cannot be imported from a Client Component module`）。Provider 等は index から外す — 由来: @murakami-shin_101 misc-ui-v2#138
- ブラウザ API の feature detection をモジュール評価時に確定させない（SSR で false、クライアントで true → ハイドレーション不一致）。`useEffect` 内で判定する — 由来: @murakami-shin_101 misc-ui-v2#87
- Server Action 内で同じ取得・権限チェック（`getLoginUser` / `requireContentsEdit` 等）が複数経路で走るなら React `cache()` で 1 リクエスト 1 回に畳む（保存成功後の再判定で 403 へ飛ぶ等の副作用を防ぐ） — 由来: @murakami-shin_101 misc-ui-v2#142
