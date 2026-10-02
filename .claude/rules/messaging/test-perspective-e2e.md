---
paths:
  - "e2e/**/*.ts"
---

# テストコード観点 (E2E / Playwright)

このリポジトリに Playwright による E2E 基盤 (`e2e/`) が存在する場合にのみ適用される。E2E 基盤が無いリポジトリでは無視してよい。

## 原則

- E2E は **UI観測で確認でき、データ非依存にできる主要フロー**に限る。**1 E2E = 1 ユーザーストーリー**。
- 実配信・目視確認・大量件数・別アカウントが必要なケースはE2E化しない（手動の担当）。
- UT/ITで安く確認できるものをE2Eに寄せない（分岐・境界値→UT、配線→IT）。

## 書いてはいけないテストコード

1. **件数や特定IDに依存したアサーション**

   ```ts
   // ❌ データ件数に依存
   await expect(page.getByRole('row')).toHaveCount(10);

   // ✅ 絞り込みで状態を確定させる
   await page.getByLabel('ステータス').selectOption('公開済み');
   await expect(page.getByRole('row')).toHaveCount(1);
   ```

2. **状態変更を伴うE2Eの後始末忘れ**

   - 保存・更新系は **save+revert** を前提にする（前後に API から対象を削除して初期状態を保証する。`afterEach` でも削除する）。

## ロケータの優先順位（Playwright）

1. `getByRole` / `data-testid`
2. `getByText`（対象要素に必ずスコープする。ページ全体走査で同名要素を誤検出しない）

アイコンのみのボタンなどアクセシブルネームが不安定な要素は `getByRole('button', { name })` が不安定になりやすい。`getByText(exact).closest('button')` で辿る。
