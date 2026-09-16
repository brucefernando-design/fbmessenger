# Allia2 — Messenger Agent

Conecta tu Página de Facebook para que Allia2 responda mensajes en Messenger.

## Inicio rápido (dos terminales)

```sh
# Terminal 1 — frontend Vite en :8080
cp .env.example .env   # edita VITE_FB_APP_ID, FB_APP_ID, FB_APP_SECRET
npm install
npm run dev

# Terminal 2 — servidor de intercambio en :8787
npm run server
```

## Configurar Facebook App

1. [developers.facebook.com](https://developers.facebook.com) → **Crear app** → tipo **Business**.
2. Panel izquierdo: **Facebook Login para empresas** → **Configuración**.
3. **Valid OAuth Redirect URIs**: `http://localhost:8080/conectar/callback`.
4. Copia el **App ID** (panel principal) y el **App Secret** (Configuración > Básica).
5. Pega ambos en `.env` (`FB_APP_ID`, `FB_APP_SECRET`). El secreto NUNCA en `src/`.
6. Sin App Review, solo admins/testers de la app pueden autorizar.

> ⚠️ `data/pages.json` y `.env` están en `.gitignore`. No los subas a GitHub.
