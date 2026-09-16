# Allia2 — Messenger Agent

Conecta tu Página de Facebook para que Allia2 responda mensajes en Messenger.

## Inicio rápido (dos terminales)

```sh
# Terminal 1 — frontend Vite en :8080
cp .env.example .env   # edita las variables
npm install
npm run dev

# Terminal 2 — servidor Express en :8787
npm run server
```

## Configurar Facebook App

1. [developers.facebook.com](https://developers.facebook.com) → **Crear app** → tipo **Business**.
2. Panel izquierdo: **Facebook Login para empresas** → **Configuración**.
3. **Valid OAuth Redirect URIs**: `http://localhost:8080/conectar/callback`.
4. Copia **App ID** y **App Secret** → pégalos en `.env` (`FB_APP_ID`, `FB_APP_SECRET`).
5. Sin App Review, solo admins/testers de la app pueden autorizar.

## Configurar Webhook de Messenger

1. En `.env` pon `FB_VERIFY_TOKEN=<cualquier_string_secreto>`.
2. Corre: `ngrok http 8787` — copia la URL `https://xxxx.ngrok-free.app`.
3. En Meta → tu App → **Messenger** → **Webhooks** → editar:
   - **Callback URL**: `https://xxxx.ngrok-free.app/api/facebook/webhook`
   - **Verify Token**: el mismo valor de `FB_VERIFY_TOKEN`
   - Suscríbete a: `messages`, `messaging_postbacks`
4. Conecta una Página OAuth, ve a `/pages/<id>` → **Activar webhook (prueba)**.
5. Envía un mensaje a la Página desde Messenger — verás el eco en el servidor.

> ⚠️ `data/pages.json` y `.env` están en `.gitignore`. No los subas a GitHub.
> El `FB_APP_SECRET` y `FB_VERIFY_TOKEN` NUNCA van en `src/` ni en variables `VITE_`.
