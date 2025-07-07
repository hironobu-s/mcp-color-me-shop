# mcp-color-me-shop

カラーミーショップのAPIをMCP（Model Context Protocol）経由で操作できるサーバーです。

## 概要

このプロジェクトは、カラーミーショップのAPIをMCPサーバーとして実装したものです。Cloudflare Workers上で動作し、カラーミーショップのOAuth認証を通じてショップデータの読み取りや更新が可能です。

## 特徴

- 🔐 OAuth 2.0認証によるセキュアなAPI接続
- 📦 商品、在庫、売上、顧客データの管理
- 🛡️ 環境変数による読み取り専用/読み書きモードの切り替え
- ☁️ Cloudflare Workers上でのサーバーレス実行
- 🚀 SSE（Server-Sent Events）を使用した効率的な通信

## 実装済みのMCPツール

### 読み取り系ツール（18個）
- `get_shop` - ショップ情報の取得
- `get_products` - 商品一覧の取得
- `get_product` - 商品詳細の取得
- `get_stocks` - 在庫一覧の取得
- `get_stock` - 在庫詳細の取得
- `get_sales` - 売上一覧の取得
- `get_sale` - 売上詳細の取得
- `get_customers` - 顧客一覧の取得
- `get_customer` - 顧客詳細の取得
- `get_categories` - カテゴリー一覧の取得
- `get_payments` - 決済方法一覧の取得
- `get_deliveries` - 配送方法一覧の取得
- `get_delivery_date_settings` - お届け希望日設定の取得
- `get_shop_coupons` - クーポン一覧の取得
- `get_gift_settings` - ギフト設定の取得
- `get_regular_cycle_settings` - 定期購入サイクル設定の取得
- `get_page_layout_parts` - ページレイアウトパーツの取得
- `get_templates` - テンプレート一覧の取得

### 書き込み系ツール（11個）
- `create_product` - 商品の作成
- `update_product` - 商品の更新
- `delete_product` - 商品の削除
- `create_stock` - 在庫の作成
- `update_stock` - 在庫の更新
- `delete_stock` - 在庫の削除
- `update_sale` - 売上の更新
- `cancel_sale` - 売上のキャンセル
- `create_customer` - 顧客の作成
- `update_customer` - 顧客の更新
- `create_shop_coupon` - クーポンの作成

## セットアップ

### 必要な環境
- Node.js 18以上
- npm
- Cloudflare アカウント
- カラーミーショップの開発者アカウント
- カラーミーショップの管理者権限（副管理者権限ではAPIアクセスができません）

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/hironobu-s/mcp-color-me-shop.git
cd mcp-color-me-shop

# 依存関係のインストール
npm install
```

### 環境変数の設定

`wrangler.jsonc`で以下の環境変数を設定してください：

```json
{
  "vars": {
    "COLORME_READ_ONLY": "true",  // 読み取り専用モード（"false"で読み書き可能）
    "COOKIE_ENCRYPTION_KEY": "your-encryption-key",
    "COLOR_ME_CLIENT_ID": "your-client-id",
    "COLOR_ME_CLIENT_SECRET": "your-client-secret"
  }
}
```

### Cloudflare KVの設定

このプロジェクトはOAuth認証情報を保存するためにCloudflare Workers KVを使用します。デプロイ前に以下の手順でKVネームスペースを作成し、`wrangler.jsonc`に設定する必要があります：

1. KVネームスペースの作成：
```bash
npx wrangler kv namespace create "OAUTH_KV"
```

2. 作成されたKVネームスペースのIDを`wrangler.jsonc`に設定：
```json
{
  "kv_namespaces": [
    {
      "binding": "OAUTH_KV",
      "id": "作成されたKVネームスペースのID"
    }
  ]
}
```

`OAUTH_KV`はOAuthトークン情報を安全に保存するための専用のKVネームスペースです。このストレージはセキュリティを重視した設計になっており、シークレット（アクセストークン、リフレッシュトークン等）はハッシュ化されて保存されます。

### CloudFlare Workersへデプロイ

```bash
# デプロイ
npm run deploy
```

## 使用方法

Claude (Web版) での設定例です

### Claudeでの設定

1. 以下を参考にClaudeにMCPサーバーの設定を追加する

[Remote MCPを使用したカスタムインテグレーションの開始方法](https://support.anthropic.com/ja/articles/11175166-remote-mcp%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%97%E3%81%9F%E3%82%AB%E3%82%B9%E3%82%BF%E3%83%A0%E3%82%A4%E3%83%B3%E3%83%86%E3%82%B0%E3%83%AC%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AE%E9%96%8B%E5%A7%8B%E6%96%B9%E6%B3%95)

ここで設定した「連携名」は、後で使うのでメモしておきます

2. 接続する

Claudeから接続すると、カラーミーショップのOAuth認証画面へリダイレクトされますので、カラーミーショップの管理者アカウントでログイン（副管理者権限では利用できません）

認証完了後、Claudeから各種操作が可能になります


3. Claudeとの会話で利用

以下のように最初にMCPサーバーを使うことを宣言しておくと、確実に使ってくれます。

```
「連携名」を使ってショップ管理を行います。
```

そうするとMCPサーバーを通じてデータ取得が行われます。その後は、「受注状況を知りたい」「在庫一覧を取得して」「○月の売り上げを集計して」のように使うことができます。

## セキュリティ

- OAuth 2.0による認証
- 環境変数`COLORME_READ_ONLY`でAPIアクセスを制限
- Cloudflare WorkersのDurable Objectsによるセッション管理

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>

