---
paths:
  - "**/*.stories.tsx"
  - "**/*.stories.ts"
---

# テストコード観点 (Storybook + Vitest browser mode)

`*.stories.tsx` はビジュアル確認用のstoryとplay関数によるテストの両方に使われるため、目的に応じて以下を分ける。

## storyの記法ルール

（現時点では規約なし。ビジュアル確認・カタログ目的のstoryには特別な考慮は不要。従来どおり、storybookのバージョンに沿った適切な記法で作成すること。今後ここに規約が増え、ファイルの実態が「テスト観点」からズレてきた場合は別ファイルへの分割を検討する。）

## テストの記法ルール

**適用条件**: Storybook v10 / Vitest v4 / Playwright（`@playwright/test`ではなくVitestのbrowser providerとして）が導入されている場合にのみ適用される。条件を満たさない場合はこの節を無視し、通常の `test-perspective.md`（jsdom + testing-library）のIT-①に従う。

- IT-①（画面表示への反映）は、こちらで書くことを検討する。jsdomでは再現できない実レイアウト・実CSS・実アクセシビリティツリーを前提にできる。
- IT-②（コンポーネント経由の出力/コールバック）は画面表示に依存しないため、無理にこちらへ寄せず`test-perspective.md`側（jsdom）のままでよい。
