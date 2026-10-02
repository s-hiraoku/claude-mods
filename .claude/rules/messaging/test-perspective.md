---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "**/*.spec.tsx"
---

# テストコード観点 (UT/IT)

## 原則：レイヤーごとの責務を混ぜない

- **UT（単体・vitest unit）**: 分岐・境界値・バリデーション是非・変換など、入出力が値で完結する純ロジック。**型別の網羅もUT側**で行う。
- **IT（結合・testing-library）**: UTの結果がコンポーネントを通して正しく伝播しているかを確認する。2パターンある。
  - **IT-①（画面表示への反映）**: エラー文言の表示、保存/実行ボタンの活性・非活性、状態による表示切替など、DOM上に正しく反映されているか。jsdomでは`getComputedStyle`や実レイアウトなど**ブラウザ/DOM自体のAPI**をモックする必要が出ることがある（アプリケーションロジックのモック＝API・ストア等とは別軸）。この種のモックが必要になった場合、実ブラウザで動くコンポーネントテスト基盤（例: Storybook + Vitest browser mode）が導入されていればそちらで書くことを検討する。未導入・条件を満たさない場合は通常のjsdomテストで対応する。
  - **IT-②（コンポーネント経由の出力）**: `onSubmit` 等のコールバック引数やemitされる値など、画面には出ないがコンポーネントの配線を通した結果オブジェクトが正しい形になっているか。
- **テスト数は「値のパターン数」ではなく「独立した配線・振る舞いの数」に対して増やす。** 同じ配線であれば代表1パターンで機能していることは証明できる。型別・値別の総当たりはUTの仕事。別の配線（例: ステータスがボタン表示と色を独立に制御している）であれば、その数だけ書く。

## 書いてはいけないテストコード

1. **[UT/IT共通] 期待値のハードコード**（実装の実値を使わず、想定文言を手で書く）

   ```ts
   // ❌ 実装と無関係な文言をハードコード
   expect(errorText).toBe("入力してください");

   // ✅ 実装のvalidator/定数から得た実値を使う（実装が変わっても追随する）
   expect(errorText).toBe(REQUIRED_MESSAGE);
   ```

2. **[IT] 同じ配線を値だけ変えて何度も確認する**（型別網羅と同じ轍。UTと役割が重複する。**UT側で値を網羅するのは正しい振る舞い**なので、この禁止はIT限定であり混同しない）

   ```ts
   // ❌ 「statusがボタン表示を切り替える」という同じ配線を値ごとに総当たり
   it('status=draftで編集ボタンが表示される', () => { /* ... */ });
   it('status=publishedで編集ボタンが非表示になる', () => { /* ... */ });
   it('status=archivedで編集ボタンが非表示になる', () => { /* ... */ });

   // ✅ 配線が機能していることを示す代表1パターンで足りる
   it('status=draftで編集ボタンが表示される', () => {
     render(<StatusBadge status="draft" />);
     expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
   });
   ```

3. **[UT/IT共通] 差分に張り付いたテスト（変更検出テスト / change-detector）**（要件ではなく「今の実装がどうなっているか」を写経し、修正と同時に必ず green になるテスト）

   要件（利用者が観測する振る舞い）ではなく、選んだ実装メカニズムの構造を検証すると、テストは修正した瞬間に必ず通り、**守りたい振る舞いを守らない**。特に、ハーネスで観測できない振る舞い（実レイアウト・重なり順・実CSS など、jsdom で再現が難しい領域）を、観測できる構造代理にすり替えたまま挙動保証のように扱うのが危険。

   ```tsx
   // ❌ 「アイコンを button の外に出した」という"実装の差分"の写経。
   //    handler の無い兄弟ノードを click しても DOM 伝播上そもそも何も起きず、
   //    後から button に z-index が付く等の現実的な回帰が入っても green のまま。
   it('アイコンをクリックしてもメニューはトグルしない', () => {
     render(<MenuBar defaultExpanded />);                    // メニューは開いた状態で描画
     const menuBar = screen.getByRole('menubar');
     fireEvent.click(screen.getByTestId('keyboard-icon'));   // handler の無いアイコン要素
     expect(menuBar).toHaveAttribute('aria-expanded', 'true'); // 開いたまま = 実質何も検証していない
   });

   // ✅ やむなく jsdom の構造ガードに留めるなら、「構造保証のみ」と明示して挙動保証に偽装しない。
   it('アイコンは button の外に描画される（構造保証のみ・実クリック挙動は e2e で担保）', () => {
     render(<MenuBar defaultExpanded />);
     expect(screen.getByTestId('keyboard-icon').closest('button')).toBeNull();
   });
   ```

   第一選択は要件（利用者観測の振る舞い）から書くこと。jsdom で観測できない挙動は観測できる harness へ寄せる（実レイアウト・重なり順は Storybook + Vitest browser mode、画面横断は e2e）。構造ガードは最後の手段で、上記のように「構造保証のみ」と明示する。

   **嗅ぎ分け**: ①Issue を読まず diff だけで書けるアサーションは疑う ②現実的な回帰を入れても green のままなら振る舞いを守っていない ③handler の無いノードを叩いて「何も起きない」を確認するのは空虚。

## IT-②: コンポーネント経由の出力（イベント/コールバック）の妥当性

画面のテキストではなく、コンポーネントを介した結果（コールバック引数・emitされる値）を確認する。UTと違い、実際にレンダリングしてイベントを発火する必要がある点でITに属する。

```ts
// ✅ フォームを操作し、onSubmitに渡る値の構造を確認する
it('入力内容を送信するとonSubmitに正しい形のオブジェクトが渡る', async () => {
  const onSubmit = vi.fn();
  render(<ProfileForm onSubmit={onSubmit} />);
  await userEvent.type(screen.getByLabelText('名前'), '山田太郎');
  await userEvent.click(screen.getByRole('button', { name: '送信' }));
  expect(onSubmit).toHaveBeenCalledWith({ name: '山田太郎' });
});
```

## ロケータの優先順位（testing-library）

1. `getByRole` / `data-testid`
2. `getByText`（対象要素に必ずスコープする。ページ全体走査で同名要素を誤検出しない）

`setupTest.ts` 等で `getComputedStyle` をモックしている環境では、アクセシブルネーム計算に失敗し `getByRole('button', { name })` が0件になることがある。その場合は `getByText(...).closest('button')` で辿る。

## 判断基準

まず `render()`（testing-libraryでのコンポーネントマウント）を呼んでいるかで機械的に判定する。呼んでいなければUT、呼んでいればIT。UTは値で完結するロジックなのでrender()を呼ぶ必要が無く、呼ぶ時点で定義上IT側になる（`renderHook()`はコンポーネントをマウントしないため対象外。カスタムhookの純ロジックはUT側で扱う）。

IT と判定したら、続けて次の問いで判断する。

> このアサーションは「画面への反映」を見ているか（→IT-①）、それとも「コンポーネント経由の出力」を見ているか（→IT-②)？
> 同じ配線を確認する2つ目以降のテストを書きそうになったら、それは値の網羅（UT）に押し戻せないか考える。
