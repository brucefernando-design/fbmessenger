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

## Configuración para Meta Developers (Producción fbm.allia2.com.mx)

- **Dominio de la App**: `fbm.allia2.com.mx`
- **OAuth Redirect URI**: `https://fbm.allia2.com.mx/conectar/callback`
- **Webhook Callback URL**: `https://fbm.allia2.com.mx/api/facebook/webhook`
- **Verify Token**: el valor configurado en `FB_VERIFY_TOKEN`
- **Campos de Webhook**: `messages`, `messaging_postbacks` en tu página vinculada (ej. `Fta Laredo`)

> ⚠️ `data/pages.json` y `.env` están en `.gitignore`. No los subas a GitHub.
> El `FB_APP_SECRET` y `FB_VERIFY_TOKEN` NUNCA van en `src/` ni en variables `VITE_`.
