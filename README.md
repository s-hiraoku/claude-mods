# hiraoku-claude-mods

hiraoku の個人用 Claude Code mod 集です。
このリポジトリ自体が plugin marketplace（名前は `hiraoku-mods`）なので、Claude Code から直接インストールできます。

## mod 一覧

| mod | 内容 |
| --- | --- |
| [status-meter](plugins/status-meter/README.md) | Desktop アプリの入力欄の上に、コンテキスト・5 時間制限・7 日制限の使用率を SVG メーターで表示する。形は `/meter` で 5 パターンから選べる |

## インストール

Claude Code のプロンプトで実行します。

```text
/plugin marketplace add sym-product-sandbox/hiraoku-claude-mods
/plugin install status-meter@hiraoku-mods
```

このリポジトリは sym-product-sandbox の internal です。組織のメンバーで、手元の git が GitHub に認証できている必要があります。

## 併用している外部プラグイン

`.claude/settings.json` で次も有効にしています。このリポジトリを開いた Claude Code（ローカル、クラウドとも）で、信頼を確認したあとに自動で入ります。

| プラグイン | 内容 |
| --- | --- |
| [pstack@open-pstack](https://github.com/ericlitman/open-pstack) | Cursor の pstack（Lauren Tan 作）を Claude Code 向けにした非公式版。`/pstack:setup-pstack` で初期設定し、`/pstack:poteto-mode <タスク>` で使う |

他のリポジトリでも使うには、ローカルの Claude Code で次を実行します。

```text
/plugin marketplace add ericlitman/open-pstack
/plugin install pstack@open-pstack
```

クラウドでは bun は使えますが、Grok CLI は動きません（サンドボックスの制約）。3 モデルのレビューは Claude と Codex の 2 モデルになります。

## 更新

```text
/plugin marketplace update hiraoku-mods
/plugin update status-meter@hiraoku-mods
```

更新は Claude Code（Desktop アプリ）の再起動後に反映されます。
mod を変更したら `plugin.json` の `version` を上げてください。上げないと、インストール済みのキャッシュが更新されません。

## 開発

各 mod は `plugins/<name>/` にあり、`.claude-plugin/marketplace.json` に登録します。
テストは mod のディレクトリで `claude plugin test`、検証はリポジトリのルートで `claude plugin validate .` を実行します。

---

# hiraoku-claude-mods (English)

A personal collection of Claude Code mods by hiraoku.
The repository is itself a plugin marketplace named `hiraoku-mods`.

## Mods

| Mod | What it does |
| --- | --- |
| [status-meter](plugins/status-meter/README.md) | Shows context, 5-hour and 7-day limit usage as SVG meters above the prompt in the Desktop app. Pick one of five patterns with `/meter`. |

## Install

```text
/plugin marketplace add sym-product-sandbox/hiraoku-claude-mods
/plugin install status-meter@hiraoku-mods
```

The repository is internal to sym-product-sandbox, so you need to be an organization member and your local git must be able to authenticate to GitHub.

## Update

```text
/plugin marketplace update hiraoku-mods
/plugin update status-meter@hiraoku-mods
```

Updates apply after restarting Claude Code (the Desktop app). Bump `version` in `plugin.json` whenever a mod changes, or the installed cache is not refreshed.

## Development

Each mod lives in `plugins/<name>/` and is listed in `.claude-plugin/marketplace.json`. Run `claude plugin test` in a mod's directory and `claude plugin validate .` at the repository root.
