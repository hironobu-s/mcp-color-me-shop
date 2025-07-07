import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { ColorMeHandler } from "./colorme-handler";
import { 
	ColorMeApiClient, 
	Shop, 
	Product, 
	Stock, 
	Sale, 
	Customer, 
	ShopCoupon,
	SalesStat,
	Category,
	Group,
	Delivery,
	Payment,
	Gift
} from "./colorme-api-client";

// 認証プロセスから取得したコンテキスト情報
// 暗号化されて認証トークンに保存され、MyMCPのthis.propsとして提供される
type Props = {
	shopId: string;        // ショップID
	shopName: string;      // ショップ名
	shopUrl: string;       // ショップURL
	accessToken: string;   // アクセストークン
	scopes: string[];      // 付与されたスコープ
};

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
	server = new McpServer({
		name: "カラーミーショップ MCP サーバー",
		version: "0.0.1",
	});

	async init() {
		// APIクライアントの初期化
		const apiClient = new ColorMeApiClient(this.props.accessToken);
		
		// 環境変数で読み書きモードを制御（デフォルトは読み取り専用）
		const isReadOnly = (this.env as any).COLORME_READ_ONLY !== 'false';
		
		// ショップ情報取得ツール
		this.server.tool(
			"get_shop",
			"ショップの基本情報（名前、URL、契約状態等）を取得します。",
			{},
			async () => {
				try {
					const response = await apiClient.get<{ shop: Shop }>("/shop.json");
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.shop, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 商品一覧取得ツール
		this.server.tool(
			"list_products",
			"商品一覧を取得します。ページネーション対応。",
			{
				limit: z.number().optional().describe("取得件数（デフォルト: 10, 最大: 50）"),
				offset: z.number().optional().describe("開始位置（デフォルト: 0）"),
				fields: z.string().optional().describe("取得するフィールド（カンマ区切り）"),
				published: z.boolean().optional().describe("公開状態でフィルタ"),
			},
			async ({ limit = 10, offset = 0, fields, published }) => {
				try {
					const params: Record<string, any> = {
						limit: Math.min(limit, 50),
						offset,
					};
					if (fields) params.fields = fields;
					if (published !== undefined) params.published = published;
					
					const response = await apiClient.get<{ products: Product[] }>("/products.json", params);
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.products, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 商品詳細取得ツール
		this.server.tool(
			"get_product",
			"指定された商品IDの詳細情報を取得します。",
			{
				product_id: z.number().describe("商品ID"),
			},
			async ({ product_id }) => {
				try {
					const response = await apiClient.get<{ product: Product }>(`/products/${product_id}.json`);
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.product, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 在庫一覧取得ツール
		this.server.tool(
			"get_stocks",
			"在庫情報の一覧を取得します。商品IDでフィルタ可能。",
			{
				product_id: z.number().optional().describe("商品IDでフィルタ"),
				limit: z.number().optional().describe("取得件数（デフォルト: 10, 最大: 50）"),
				offset: z.number().optional().describe("開始位置（デフォルト: 0）"),
			},
			async ({ product_id, limit = 10, offset = 0 }) => {
				try {
					const params: Record<string, any> = {
						limit: Math.min(limit, 50),
						offset,
					};
					if (product_id) params.product_id = product_id;
					
					const response = await apiClient.get<{ stocks: Stock[] }>("/stocks.json", params);
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.stocks, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 受注一覧取得ツール
		this.server.tool(
			"list_sales",
			"受注情報の一覧を取得します。期間、ステータス等でフィルタ可能。",
			{
				limit: z.number().optional().describe("取得件数（デフォルト: 10, 最大: 50）"),
				offset: z.number().optional().describe("開始位置（デフォルト: 0）"),
				fields: z.string().optional().describe("取得するフィールド（カンマ区切り）"),
				accepted_status: z.string().optional().describe("受注状態でフィルタ"),
				paid_status: z.string().optional().describe("決済状態でフィルタ"),
				delivered_status: z.string().optional().describe("配送状態でフィルタ"),
				start_date: z.string().optional().describe("開始日（YYYY-MM-DD形式）"),
				end_date: z.string().optional().describe("終了日（YYYY-MM-DD形式）"),
			},
			async ({ limit = 10, offset = 0, fields, accepted_status, paid_status, delivered_status, start_date, end_date }) => {
				try {
					const params: Record<string, any> = {
						limit: Math.min(limit, 50),
						offset,
					};
					if (fields) params.fields = fields;
					if (accepted_status) params.accepted_status = accepted_status;
					if (paid_status) params.paid_status = paid_status;
					if (delivered_status) params.delivered_status = delivered_status;
					if (start_date) params.start_date = start_date;
					if (end_date) params.end_date = end_date;
					
					const response = await apiClient.get<{ sales: Sale[] }>("/sales.json", params);
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.sales, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 受注詳細取得ツール
		this.server.tool(
			"get_sale",
			"指定された受注IDの詳細情報を取得します。",
			{
				sale_id: z.number().describe("受注ID"),
			},
			async ({ sale_id }) => {
				try {
					const response = await apiClient.get<{ sale: Sale }>(`/sales/${sale_id}.json`);
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.sale, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 売上統計取得ツール
		this.server.tool(
			"get_sales_stats",
			"売上統計情報を取得します。期間を指定して集計データを取得可能。",
			{
				start_date: z.string().optional().describe("開始日（YYYY-MM-DD形式）"),
				end_date: z.string().optional().describe("終了日（YYYY-MM-DD形式）"),
				unit: z.enum(["day", "month"]).optional().describe("集計単位（day: 日別, month: 月別）"),
			},
			async ({ start_date, end_date, unit = "day" }) => {
				try {
					const params: Record<string, any> = { unit };
					if (start_date) params.start_date = start_date;
					if (end_date) params.end_date = end_date;
					
					const response = await apiClient.get<{ stats: SalesStat[] }>("/sales/stat.json", params);
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.stats, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 顧客一覧取得ツール
		this.server.tool(
			"list_customers",
			"顧客情報の一覧を取得します。メールアドレスや名前で検索可能。",
			{
				limit: z.number().optional().describe("取得件数（デフォルト: 10, 最大: 50）"),
				offset: z.number().optional().describe("開始位置（デフォルト: 0）"),
				fields: z.string().optional().describe("取得するフィールド（カンマ区切り）"),
				name: z.string().optional().describe("顧客名で検索"),
				email: z.string().optional().describe("メールアドレスで検索"),
				member: z.boolean().optional().describe("会員/非会員でフィルタ"),
			},
			async ({ limit = 10, offset = 0, fields, name, email, member }) => {
				try {
					const params: Record<string, any> = {
						limit: Math.min(limit, 50),
						offset,
					};
					if (fields) params.fields = fields;
					if (name) params.name = name;
					if (email) params.email = email;
					if (member !== undefined) params.member = member;
					
					const response = await apiClient.get<{ customers: Customer[] }>("/customers.json", params);
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.customers, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 顧客詳細取得ツール
		this.server.tool(
			"get_customer",
			"指定された顧客IDの詳細情報を取得します。",
			{
				customer_id: z.number().describe("顧客ID"),
			},
			async ({ customer_id }) => {
				try {
					const response = await apiClient.get<{ customer: Customer }>(`/customers/${customer_id}.json`);
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.customer, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// カテゴリー一覧取得ツール
		this.server.tool(
			"list_categories",
			"商品カテゴリーの一覧を取得します。階層構造で整理された商品分類。",
			{},
			async () => {
				try {
					const response = await apiClient.get<{ categories: Category[] }>("/categories.json");
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.categories, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// グループ一覧取得ツール
		this.server.tool(
			"list_groups",
			"商品グループの一覧を取得します。商品の分類・整理に使用。",
			{},
			async () => {
				try {
					const response = await apiClient.get<{ groups: Group[] }>("/groups.json");
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.groups, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 配送方法一覧取得ツール
		this.server.tool(
			"list_deliveries",
			"配送方法の一覧を取得します。送料や配送オプションの確認。",
			{},
			async () => {
				try {
					const response = await apiClient.get<{ deliveries: Delivery[] }>("/deliveries.json");
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.deliveries, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 決済方法一覧取得ツール
		this.server.tool(
			"list_payments",
			"決済方法の一覧を取得します。利用可能な支払い方法の確認。",
			{},
			async () => {
				try {
					const response = await apiClient.get<{ payments: Payment[] }>("/payments.json");
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.payments, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// ギフト設定取得ツール
		this.server.tool(
			"get_gift_settings",
			"ギフト設定を取得します。のし・ギフトラッピングの利用可否確認。",
			{},
			async () => {
				try {
					const response = await apiClient.get<{ gift: Gift }>("/gift.json");
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.gift, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// ショップクーポン一覧取得ツール
		this.server.tool(
			"list_shop_coupons",
			"ショップクーポンの一覧を取得します。利用可能なクーポン情報。",
			{
				limit: z.number().optional().describe("取得件数（デフォルト: 10, 最大: 50）"),
				offset: z.number().optional().describe("開始位置（デフォルト: 0）"),
			},
			async ({ limit = 10, offset = 0 }) => {
				try {
					const params = {
						limit: Math.min(limit, 50),
						offset,
					};
					
					const response = await apiClient.get<{ coupons: ShopCoupon[] }>("/shop_coupons.json", params);
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.coupons, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// ショップクーポン詳細取得ツール
		this.server.tool(
			"get_shop_coupon",
			"指定されたクーポンIDの詳細情報を取得します。",
			{
				coupon_id: z.number().describe("クーポンID"),
			},
			async ({ coupon_id }) => {
				try {
					const response = await apiClient.get<{ coupon: ShopCoupon }>(`/shop_coupons/${coupon_id}.json`);
					return {
						content: [{
							type: "text",
							text: JSON.stringify(response.coupon, null, 2)
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
						}],
						isError: true,
					};
				}
			}
		);
		
		// 書き込みモードの場合のみ、更新系ツールを登録
		if (!isReadOnly) {
			// 在庫更新ツール
			this.server.tool(
				"update_stock",
				"在庫数を更新します。複数商品の在庫を一括更新可能。",
				{
					stocks: z.array(z.object({
						product_id: z.number().describe("商品ID"),
						variant_id: z.number().nullable().optional().describe("バリアントID"),
						stock_quantity: z.number().describe("在庫数"),
					})).describe("更新する在庫データの配列"),
				},
				async ({ stocks }) => {
					try {
						const response = await apiClient.put("/stocks.json", { stocks });
						return {
							content: [{
								type: "text",
								text: "在庫を更新しました。"
							}],
						};
					} catch (error) {
						return {
							content: [{
								type: "text",
								text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
							}],
							isError: true,
						};
					}
				}
			);
			
			// 商品更新ツール
			this.server.tool(
				"update_product",
				"商品情報（名前、価格、公開状態等）を更新します。",
				{
					product_id: z.number().describe("商品ID"),
					product: z.object({
						name: z.string().optional().describe("商品名"),
						price: z.number().optional().describe("販売価格"),
						sale_price: z.number().nullable().optional().describe("特価"),
						published: z.boolean().optional().describe("公開状態"),
						simple_explain: z.string().optional().describe("簡単な説明"),
						explain: z.string().optional().describe("詳細説明"),
					}).describe("更新する商品データ"),
				},
				async ({ product_id, product }) => {
					try {
						const response = await apiClient.put(`/products/${product_id}.json`, { product });
						return {
							content: [{
								type: "text",
								text: "商品情報を更新しました。"
							}],
						};
					} catch (error) {
						return {
							content: [{
								type: "text",
								text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
							}],
							isError: true,
						};
					}
				}
			);
			
			// 商品登録ツール
			this.server.tool(
				"create_product",
				"新しい商品を登録します。",
				{
					product: z.object({
						name: z.string().describe("商品名"),
						price: z.number().describe("販売価格"),
						sale_price: z.number().nullable().optional().describe("特価"),
						stock_quantity: z.number().optional().describe("在庫数"),
						weight: z.number().optional().describe("重量（グラム）"),
						taxable: z.boolean().optional().describe("課税対象（デフォルト: true）"),
						published: z.boolean().optional().describe("公開状態（デフォルト: false）"),
						simple_explain: z.string().optional().describe("簡単な説明"),
						explain: z.string().optional().describe("詳細説明"),
						model_number: z.string().optional().describe("型番"),
					}).describe("登録する商品データ"),
				},
				async ({ product }) => {
					try {
						const response = await apiClient.post("/products.json", { product });
						return {
							content: [{
								type: "text",
								text: "商品を登録しました。"
							}],
						};
					} catch (error) {
						return {
							content: [{
								type: "text",
								text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
							}],
							isError: true,
						};
					}
				}
			);
			
			// 顧客登録ツール
			this.server.tool(
				"create_customer",
				"新しい顧客を登録します。",
				{
					customer: z.object({
						name: z.string().describe("顧客名"),
						furigana: z.string().optional().describe("フリガナ"),
						email: z.string().describe("メールアドレス"),
						postal: z.string().describe("郵便番号"),
						prefecture_id: z.number().describe("都道府県ID（1-47）"),
						address: z.string().describe("住所"),
						tel: z.string().describe("電話番号"),
						tel2: z.string().optional().describe("電話番号2"),
						member: z.boolean().optional().describe("会員フラグ（デフォルト: true）"),
						mail_magazine: z.boolean().optional().describe("メルマガ購読（デフォルト: false）"),
					}).describe("登録する顧客データ"),
				},
				async ({ customer }) => {
					try {
						const response = await apiClient.post("/customers.json", { customer });
						return {
							content: [{
								type: "text",
								text: "顧客を登録しました。"
							}],
						};
					} catch (error) {
						return {
							content: [{
								type: "text",
								text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
							}],
							isError: true,
						};
					}
				}
			);
			
			// 顧客ポイント更新ツール
			this.server.tool(
				"update_customer_points",
				"顧客のショップポイントを増減します。",
				{
					customer_id: z.number().describe("顧客ID"),
					points: z.number().describe("ポイント増減値（正の値で増加、負の値で減少）"),
					memo: z.string().optional().describe("ポイント増減の理由"),
				},
				async ({ customer_id, points, memo }) => {
					try {
						const data: any = { points };
						if (memo) data.memo = memo;
						
						const response = await apiClient.post(`/customers/${customer_id}/points.json`, data);
						return {
							content: [{
								type: "text",
								text: `顧客ポイントを${points > 0 ? '追加' : '減少'}しました。`
							}],
						};
					} catch (error) {
						return {
							content: [{
								type: "text",
								text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
							}],
							isError: true,
						};
					}
				}
			);
			
			// 受注作成ツール
			this.server.tool(
				"create_sale",
				"新しい受注を作成します。",
				{
					sale: z.object({
						customer_id: z.number().optional().describe("顧客ID"),
						details: z.array(z.object({
							product_id: z.number().describe("商品ID"),
							product_num: z.number().describe("数量"),
							product_price: z.number().optional().describe("販売単価"),
						})).describe("受注明細"),
						delivery: z.object({
							name: z.string().describe("配送先名"),
							postal: z.string().describe("郵便番号"),
							prefecture_id: z.number().describe("都道府県ID"),
							address: z.string().describe("住所"),
							tel: z.string().describe("電話番号"),
							delivery_method: z.string().describe("配送方法"),
						}).describe("配送情報"),
					}).describe("受注データ"),
				},
				async ({ sale }) => {
					try {
						const response = await apiClient.post("/sales.json", { sale });
						return {
							content: [{
								type: "text",
								text: "受注を作成しました。"
							}],
						};
					} catch (error) {
						return {
							content: [{
								type: "text",
								text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
							}],
							isError: true,
						};
					}
				}
			);
			
			// 受注更新ツール
			this.server.tool(
				"update_sale",
				"受注情報を更新します。ステータス変更など。",
				{
					sale_id: z.number().describe("受注ID"),
					sale: z.object({
						accepted_status: z.string().optional().describe("受注ステータス"),
						paid_status: z.string().optional().describe("決済ステータス"),
						delivered_status: z.string().optional().describe("配送ステータス"),
						memo: z.string().optional().describe("メモ"),
					}).describe("更新する受注データ"),
				},
				async ({ sale_id, sale }) => {
					try {
						const response = await apiClient.put(`/sales/${sale_id}.json`, { sale });
						return {
							content: [{
								type: "text",
								text: "受注情報を更新しました。"
							}],
						};
					} catch (error) {
						return {
							content: [{
								type: "text",
								text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
							}],
							isError: true,
						};
					}
				}
			);
			
			// 受注キャンセルツール
			this.server.tool(
				"cancel_sale",
				"受注をキャンセルします。",
				{
					sale_id: z.number().describe("受注ID"),
					reason: z.string().optional().describe("キャンセル理由"),
				},
				async ({ sale_id, reason }) => {
					try {
						const data = reason ? { reason } : {};
						const response = await apiClient.put(`/sales/${sale_id}/cancel.json`, data);
						return {
							content: [{
								type: "text",
								text: "受注をキャンセルしました。"
							}],
						};
					} catch (error) {
						return {
							content: [{
								type: "text",
								text: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`
							}],
							isError: true,
						};
					}
				}
			);
		}
	}
}

export default new OAuthProvider({
	apiHandler: MyMCP.mount("/sse") as any,
	apiRoute: "/sse",
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: ColorMeHandler as any,
	tokenEndpoint: "/token",
});
