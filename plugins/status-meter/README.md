# status-meter

Claude Code Desktop アプリの入力欄の上に、コンテキストと 5 時間制限・7 日制限の使用率を SVG のメーターで表示する mod です。
ターミナルの statusLine（`~/.claude/statusline.sh`）の 2 行目を Desktop に移したもので、ターミナルには何も描きません。

```text
ctx 200k [ゲージ] 20% │ 5h [ゲージ] 43% ↻09:05 │ 7d [ゲージ] 5% ↻10/6
```

`[ゲージ]` の部分が SVG で、形は下の 5 パターンから選べます。

## 表示

- **ctx**：コンテキストの使用率。ラベルにコンテキストウィンドウの大きさ（千トークン単位）を付けます
- **5h / 7d**：5 時間制限と 7 日制限の使用率。リセットまで 24 時間を切っていればリセット時刻（`↻HH:MM`）、それより先なら日付（`↻M/D`）を添えます。どちらもマシンのローカル時刻です
- **色**：statusline と同じ式で、使用率 0% の緑から 50% の黄、100% の赤へ変わります。ゲージと数値の両方に使います
- **リセット済み**：リセット時刻を過ぎた制限は 0% として表示します。表示は 1 分ごとに更新します
- **セッションの間で共有**：5h と 7d はアカウント単位の値なので、受け取った値を `$.store` に保存して、マシン上のすべてのセッションで共有します。まだ応答を受け取っていない新しいセッションも、ほかのセッションが保存した最新の値を表示します。別のセッションで使った分も、1 分以内に反映されます
- **値がないとき**：どのセッションもまだ値を受け取っていない制限は `—` と表示し、ゲージは灰色の空の状態で描きます

## メーターのパターン

[Claude Code の statusline でレート制限を表示する記事](https://nyosegawa.com/posts/claude-code-statusline-rate-limits/)の 5 パターンを、文字ではなく SVG の図形で描きます。

| パターン | 形 |
| --- | --- |
| `ring` | 円の上に、使用率の分だけ弧を描く（1% 刻み） |
| `dots` | 使用率の色で塗った丸 1 つ |
| `sparkline` | 右に行くほど高い 8 本の棒を、使用率の分だけ左から点灯する |
| `bar`（既定） | 10 マスのバー。端数は最後のマスを途中まで塗る |
| `braille` | 点字のような 2×4 の点を 4 マス並べ、使用率の分だけ左下から点灯する |

## 使い方

### インストール

Claude Code のプロンプトで実行します。マーケットプレイスを登録済みなら 1 行目は不要です。

```text
/plugin marketplace add sym-product-sandbox/hiraoku-claude-mods
/plugin install status-meter@hiraoku-mods
```

リポジトリは sym-product-sandbox の internal なので、組織のメンバーで、手元の git が GitHub に認証できている必要があります。

インストールしたら Desktop アプリを再起動します。

### 表示する

1. Desktop アプリの Code タブで、Local 環境の新しいセッションを開きます
2. 何か 1 つメッセージを送ります
3. 入力欄の上にメーターの行が出ます

最初のメッセージを送るまでは、帯が出ないことがあります。

### パターンを切り替える

Desktop アプリでは、プロンプトで `/meter` にパターン名を付けて実行します。

```text
/meter bar
```

開いているセッションのメーターがすぐに切り替わり、設定に保存されるので、次のセッションでも同じパターンになります。
`/meter` だけを実行すると、選べるパターンと今のパターンを表示します。

Desktop アプリで `/config` を開くと、アプリ自体の設定画面が開き、この mod の設定はありません。

### 更新する

```text
/plugin marketplace update hiraoku-mods
/plugin update status-meter@hiraoku-mods
```

更新は Desktop アプリの再起動後に反映されます。

## 制約

- **Desktop アプリだけで表示します**。ターミナルでは何も描かず、これまでどおり statusLine が表示されます
- **Desktop では Local 環境のセッションが必要です**。クラウドのセッション（claude.ai/code、Desktop アプリの Cloud 環境、スマホのアプリなど）では表示できません。mod が描いたものはクラウドのセッションでは表示されないという、Claude Code の仕様です（[Mods overview の「Where mods run」](https://code.claude.com/docs/en/plugins/mods/overview#where-mods-run)）。セットアップスクリプトでインストールすれば mod 自体は読み込まれますが、帯は描かれず、`/meter` もアプリから使えません。詳しくは[リポジトリの README](../../README.md#動作する場所) を見てください
- **共有する値はアカウントを区別しません**。mod の API にはアカウントを識別する手段がないためです。同じマシンで別のアカウントに切り替えると、新しいセッションが最初の応答を受け取るまで、前のアカウントの値が表示されます
- **共有は最後に書いた値が勝ちます**。`$.store` には atomic な更新がないためです。各セッションは受け取ったばかりの値だけを書くので、ほぼ最新の値になりますが、ほぼ同時に 2 つのセッションが書いたときは、どちらかの値が次の更新まで残ります

動作を確認したバージョン:

- Claude Code CLI 2.1.287
- Desktop アプリ 2.19675.0（同梱の Claude Code 2.1.286）

## テスト

```bash
cd plugins/status-meter
claude plugin test               # テスト
claude plugin validate .         # manifest と hooks の検証
npx -y -p typescript tsc -p .    # 型チェック（.claude-plugin/types/ は Claude Code が生成し、git には入れない）
```
