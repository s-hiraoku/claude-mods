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
- **値がないとき**：まだ値を受け取っていない制限は `—` と表示し、ゲージは灰色の空の状態で描きます

## メーターのパターン

[Claude Code の statusline でレート制限を表示する記事](https://nyosegawa.com/posts/claude-code-statusline-rate-limits/)の 5 パターンを、文字ではなく SVG の図形で描きます。

| パターン | 形 |
| --- | --- |
| `ring`（既定） | 円の上に、使用率の分だけ弧を描く（1% 刻み） |
| `dots` | 使用率の色で塗った丸 1 つ |
| `sparkline` | 右に行くほど高い 8 本の棒を、使用率の分だけ左から点灯する |
| `bar` | 10 マスのバー。端数は最後のマスを途中まで塗る |
| `braille` | 点字のような 2×4 の点を 4 マス並べ、使用率の分だけ左下から点灯する |

### 切り替え方

`/config` の「Meter pattern」の行で選ぶか、`/plugin configure` で status-meter の設定を開きます。
`/config` で変えると、開いているセッションのメーターもすぐに切り替わります。

## インストール

Claude Code のプロンプトで実行します。マーケットプレイスを登録済みなら 1 行目は不要です。

```text
/plugin marketplace add sym-synergy/team-messaging
/plugin install status-meter@sym-synergy
/reload-plugins
```

## 制約

- **Desktop アプリだけで表示します**。ターミナルでは何も描かず、これまでどおり statusLine が表示されます
- **Desktop では Local 環境のセッションが必要です**。動作を確認したのは Local 環境で始めたセッションだけです
- **新しいセッションでは、最初の応答まで 5h と 7d は `—` です**。制限の値は API の応答と一緒に届くためです。セッションの間で値を共有する仕組み（`$.store`）は入れていません

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
