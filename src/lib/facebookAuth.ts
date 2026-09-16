/**
 * Facebook OAuth / Graph API integration layer.
 *
 * startFacebookLogin():
 *   - Si VITE_FB_APP_ID está vacío → modo demo (mock flow).
 *   - Si hay App ID → redirige a Facebook OAuth v21.0 con CSRF state.
 *
 * IMPORTANTE: El App Secret NUNCA está en el frontend.
 * El intercambio de code → token ocurre en /api/facebook/exchange (backend).
 */

const APP_ID = import.meta.env.VITE_FB_APP_ID as string | undefined;

export function getRedirectUri(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/conectar/callback`;
  }
  return (import.meta.env.VITE_FB_REDIRECT_URI as string | undefined) || "https://fbm.allia2.com.mx/conectar/callback";
}

const CSRF_KEY = "fb_oauth_state";

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

export type LoginResult = { mode: "demo" } | { mode: "real" };

/**
 * Inicia el flujo de login con Facebook.
 * - Sin App ID: devuelve { mode: "demo" } — ConnectFlow usa el mock.
 * - Con App ID: genera state CSRF, lo guarda en sessionStorage y redirige
 *   a la pantalla de OAuth de Facebook. No retorna (navegación completa).
 */
export function startFacebookLogin(): LoginResult {
  if (!APP_ID) {
    return { mode: "demo" };
  }

  // Generar state CSRF y guardarlo para verificarlo en /conectar/callback
  const state = crypto.randomUUID();
  sessionStorage.setItem(CSRF_KEY, state);

  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: getRedirectUri(),
    state,
    scope: "pages_show_list,pages_messaging,pages_manage_metadata",
    response_type: "code",
  });

  window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;

  // TypeScript necesita un return aunque nunca se alcanza
  return { mode: "real" };
}

/**
 * Recupera el state CSRF guardado en sessionStorage y lo borra.
 * Úsalo en /conectar/callback para validar el parámetro ?state=.
 */
export function consumeCsrfState(): string | null {
  const val = sessionStorage.getItem(CSRF_KEY);
  sessionStorage.removeItem(CSRF_KEY);
  return val;
}

/**
 * Envía el código al backend para que lo intercambie por un token.
 * El App Secret vive SOLO en el servidor — nunca en este archivo.
 *
 * Por ahora el backend no existe; la función devuelve un error descriptivo
 * para que /conectar/callback muestre el mensaje correcto al usuario.
 */
export async function exchangeCode(_code: string): Promise<never> {
  const res = await fetch("/api/facebook/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: _code, redirectUri: getRedirectUri() }),
  });

  if (!res.ok) {
    throw new Error(`exchange_failed:${res.status}`);
  }

  // Si el backend responde OK en el futuro, retornará los datos de la página.
  throw new Error("backend_not_implemented");
}

// TODO: GET /me/accounts — listar Páginas del usuario autenticado
export async function listPages(_userAccessToken: string): Promise<FacebookPage[]> {
  throw new Error("listPages() not implemented — pending backend");
}

// TODO: POST /{page-id}/subscribed_apps — suscribir Página al webhook
export async function subscribeWebhook(
  _pageId: string,
  _pageAccessToken: string,
): Promise<boolean> {
  throw new Error("subscribeWebhook() not implemented — pending backend");
}
