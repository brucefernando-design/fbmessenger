/**
 * Facebook OAuth / Graph API integration layer.
 *
 * These are stub functions — no real Facebook SDK is wired up yet.
 * Each function marks where the real implementation will go.
 * The connect flow in /conectar currently uses mock data from mockData.ts.
 */

export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  access_token: string;
}

export interface PageConnection {
  pageId: string;
  pageName: string;
  connectedAt: string;
  agentEnabled: boolean;
}

// TODO: Implement with Facebook Login SDK (FB.login)
// Scopes needed: pages_manage_messages, pages_read_engagement, pages_messaging
export async function startFacebookLogin(): Promise<string> {
  // Real implementation:
  // 1. Load FB SDK
  // 2. FB.login({ scope: 'pages_manage_messages,pages_read_engagement,pages_messaging' })
  // 3. Return authResponse.accessToken
  throw new Error("startFacebookLogin() not implemented — using mock flow");
}

// TODO: Exchange short-lived token for long-lived page access token
// GET /oauth/access_token?grant_type=fb_exchange_token&client_id=...&client_secret=...&fb_exchange_token=...
export async function exchangeCode(shortLivedToken: string): Promise<string> {
  throw new Error("exchangeCode() not implemented — using mock flow");
}

// TODO: GET /me/accounts to list Pages the user administers
export async function listPages(userAccessToken: string): Promise<FacebookPage[]> {
  throw new Error("listPages() not implemented — using mock flow");
}

// TODO: Subscribe the Page to receive Messenger webhook events
// POST /{page-id}/subscribed_apps
export async function subscribeWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
  throw new Error("subscribeWebhook() not implemented — using mock flow");
}
