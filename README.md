# hiraoku-claude-mods

hiraoku の個人用 Claude Code mod 集です。
このリポジトリ自体が plugin marketplace（名前は `hiraoku-mods`）なので、Claude Code から直接インストールできます。

## mod 一覧

| mod | 内容 |
| --- | --- |
| [status-meter](plugins/status-meter/README.md) | Desktop アプリの入力欄の上に、コンテキスト・5 時間制限・7 日制限の使用率を SVG メーターで表示する。形は `/meter` で 5 パターンから選べる |

## 動作する場所

mod の hooks はどこでも動きますが、mod が描いたもの（入力欄の上の帯やペイン）が表示されるのは、ターミナルと Desktop アプリの Code タブ（ローカルのセッション）だけです（[Mods overview の「Where mods run」](https://code.claude.com/docs/en/plugins/mods/overview#where-mods-run)）。

| Claude Code を動かす場所 | hooks | 描いたものの表示 |
| --- | --- | --- |
| ターミナルの `claude` | 動く | 表示される |
| Desktop アプリの Code タブ（ローカルのセッション） | 動く | 表示される |
| VS Code の拡張機能のチャット | 動く | 表示されない |
| `claude -p` と Agent SDK | 動く | 表示されない |
| Remote Control（claude.ai やスマホのアプリから） | 手元のマシンのセッションで動く | 手元のマシンのターミナルにだけ表示される |
| クラウドのセッション（claude.ai/code など） | プラグインがセッションに入っていれば動く | 表示されない |

クラウドのセッションには、リポジトリの `.claude/settings.json` に書いたマーケットプレイスとプラグイン（`extraKnownMarketplaces` と `enabledPlugins`）はインストールされません（[Configure cloud environments の「What carries over from your setup」](https://code.claude.com/docs/en/cloud-environments#what-carries-over-from-your-setup)）。
環境のセットアップスクリプトで `claude plugin marketplace add` と `claude plugin install` を実行すれば入りますが、描いたものは表示されず、mod が登録したコマンド（`/meter` など）もアプリからは使えませんでした。
status-meter のように画面に描く mod は、ローカルのセッションで使ってください。

## インストール

Claude Code のプロンプトで実行します。

```text
/plugin marketplace add sym-product-sandbox/hiraoku-claude-mods
/plugin install status-meter@hiraoku-mods
```

このリポジトリは sym-product-sandbox の internal です。組織のメンバーで、手元の git が GitHub に認証できている必要があります。

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

## Where mods work

A mod's hooks run everywhere, but what it draws (the band above the prompt, panes) appears only in the terminal and in the Desktop app's Code tab with a local session ([Mods overview, "Where mods run"](https://code.claude.com/docs/en/plugins/mods/overview#where-mods-run)).

| Where you run Claude Code | Hooks | What the mod draws |
| --- | --- | --- |
| `claude` in a terminal | Run | Appears |
| The Desktop app's Code tab (local session) | Run | Appears |
| The VS Code extension's chat panel | Run | Does not appear |
| `claude -p` and the Agent SDK | Run | Does not appear |
| Remote Control from claude.ai or the mobile app | Run in the session on your machine | Appears only in the terminal on your machine |
| A cloud session (claude.ai/code and others) | Run when the plugin is installed in the session | Does not appear |

A cloud session does not install the marketplaces and plugins declared in the repository's `.claude/settings.json` (`extraKnownMarketplaces` and `enabledPlugins`) ([Configure cloud environments, "What carries over from your setup"](https://code.claude.com/docs/en/cloud-environments#what-carries-over-from-your-setup)).
Running `claude plugin marketplace add` and `claude plugin install` in the environment's setup script installs them, but what a mod draws still does not appear, and the app did not accept a command a mod registers (such as `/meter`).
Use a mod that draws, such as status-meter, in a local session.

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
