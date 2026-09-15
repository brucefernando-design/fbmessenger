# Allia2 — Messenger Agent

Conecta tu Página de Facebook para que Allia2 responda mensajes en Messenger.

## Configurar Facebook App (para OAuth real)

1. Ve a [developers.facebook.com](https://developers.facebook.com) → **Mis apps** → **Crear app**.
2. Elige tipo **Business** (empresa). Ponle nombre, e.g. `Allia2`.
3. En el panel izquierdo abre **Facebook Login para empresas** → **Configuración**.
4. En **Valid OAuth Redirect URIs** agrega: `http://localhost:5173/conectar/callback`.
5. Copia el **App ID** del panel principal (nunca el App Secret).
6. Crea `.env` (copia `.env.example`) y pega: `VITE_FB_APP_ID=<tu-app-id>`.
7. **Sin App Review** solo responde a admins/testers de la propia app.
8. Para producción, agrega el dominio real al redirect URI y solicita App Review.

> ⚠️ El **App Secret** no va en el frontend ni en git. Solo en el servidor backend.

## Desarrollo local

```sh
git clone <repo-url>
cd fbmessenger
cp .env.example .env   # pon tu VITE_FB_APP_ID (opcional — sin él el flujo es demo)
npm install
npm run dev            # http://localhost:5173
```

Sin `VITE_FB_APP_ID` el botón "Continuar con Facebook" usa el flujo demo (mock).
Con App ID redirige a Facebook real; el backend para canjear el código viene después.
