import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { type Context, Hono } from "hono";
import { fetchUpstreamAuthToken, getUpstreamAuthorizeUrl, type Props } from "./utils";
import {
	clientIdAlreadyApproved,
	parseRedirectApproval,
	renderApprovalDialog,
} from "./workers-oauth-utils";

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

// 認可エンドポイント（GET）
app.get("/authorize", async (c) => {
	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	const { clientId } = oauthReqInfo;
	if (!clientId) {
		return c.text("無効なリクエストです", 400);
	}

	// 既に承認済みのクライアントかチェック
	if (
		await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, c.env.COOKIE_ENCRYPTION_KEY)
	) {
		return redirectToColorMe(c, oauthReqInfo);
	}

	// 承認ダイアログを表示
	return renderApprovalDialog(c.req.raw, {
		client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
		server: {
			description: "このMCPサーバーはカラーミーショップのAPIにアクセスします。",
			name: "カラーミーショップ MCP サーバー",
		},
		state: { oauthReqInfo },
	});
});

// 認可エンドポイント（POST）
app.post("/authorize", async (c) => {
	const { state, headers } = await parseRedirectApproval(c.req.raw, c.env.COOKIE_ENCRYPTION_KEY);
	if (!state.oauthReqInfo) {
		return c.text("無効なリクエストです", 400);
	}

	return redirectToColorMe(c, state.oauthReqInfo, headers);
});

// カラーミーショップのOAuth認証ページへリダイレクト
async function redirectToColorMe(
	c: Context,
	oauthReqInfo: AuthRequest,
	headers: Record<string, string> = {},
) {
	// カラーミーショップのスコープを設定
	const scopes = [
		"read_products",
		"write_products", 
		"read_sales",
		"write_sales",
		"read_shop_coupons"
	];
	
	return new Response(null, {
		headers: {
			...headers,
			location: getUpstreamAuthorizeUrl({
				clientId: c.env.COLORME_CLIENT_ID,
				redirectUri: new URL("/callback", c.req.raw.url).href,
				scope: scopes.join(" "),
				state: btoa(JSON.stringify(oauthReqInfo)),
				upstreamUrl: "https://api.shop-pro.jp/oauth/authorize",
			}),
		},
		status: 302,
	});
}

/**
 * OAuthコールバックエンドポイント
 *
 * カラーミーショップからの認証後のコールバックを処理します。
 * 一時的なコードをアクセストークンに交換し、ユーザー情報（ショップ情報）を取得して
 * MCPクライアントに返すトークンにメタデータとして保存します。
 */
app.get("/callback", async (c) => {
	// stateからoauthReqInfoを取得
	const oauthReqInfo = JSON.parse(atob(c.req.query("state") as string)) as AuthRequest;
	if (!oauthReqInfo.clientId) {
		return c.text("無効なstate", 400);
	}

	// 認可コードを取得
	const code = c.req.query("code");
	if (!code) {
		return c.text("codeが見つかりません", 400);
	}

	// アクセストークンに交換
	const [accessToken, colormeErrResponse] = await fetchUpstreamAuthToken({
		clientId: c.env.COLORME_CLIENT_ID,
		clientSecret: c.env.COLORME_CLIENT_SECRET,
		code,
		grantType: "authorization_code",
		redirectUri: new URL("/callback", c.req.url).href,
		upstreamUrl: "https://api.shop-pro.jp/oauth/token",
	});
	if (colormeErrResponse) {
		return colormeErrResponse;
	}

	// ショップ情報を取得
	const shopResponse = await fetch("https://api.shop-pro.jp/v1/shop.json", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
	if (!shopResponse.ok) {
		return c.text(`ショップ情報の取得に失敗しました: ${await shopResponse.text()}`, 500);
	}

	const { shop } = await shopResponse.json() as {
		shop: {
			id: string;
			name: string;
			url: string;
		}
	};

	// 取得したスコープを解析（実際のレスポンスに含まれる場合）
	const scopeString = Array.isArray(oauthReqInfo.scope) ? oauthReqInfo.scope.join(" ") : oauthReqInfo.scope || "";
	const scopes = scopeString.split(" ").filter(s => s);

	// MCPクライアントに新しいトークンを返す
	const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
		metadata: {
			label: shop.name,
		},
		props: {
			shopId: shop.id,
			shopName: shop.name,
			shopUrl: shop.url,
			accessToken,
			scopes,
		} as Props,
		request: oauthReqInfo,
		scope: oauthReqInfo.scope,
		userId: shop.id,
	});

	return Response.redirect(redirectTo);
});

export { app as ColorMeHandler };