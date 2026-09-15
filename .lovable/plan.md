# Plan: ALLIA2 Messenger Connect

## Qué se construye

Una web app de producción que simula una consola de integración con Facebook Messenger. El cliente (un negocio local — dentista, barbería, taller) conecta su Página de Facebook con un clic; Allia2 puede entonces leer y responder mensajes de Messenger por él. Todo es mock/local — no hay SDK de Facebook real todavía — pero la UI debe verse como una consola de integración real en la que un dentista confiaría.

## Diseño (ya comprometido — no se generan design directions)

- **Visual:** Meta / Facebook Business Suite 2025–2026. No morado SaaS. No verde WhatsApp.
- **Fuente:** Inter (cargada vía `<link>` en `__root.tsx` head).
- **Colores** (tokens en `src/styles.css`):
  - `--primary: #0866FF` (Meta blue) — solo acciones primarias
  - `--background: #F0F2F5` (superficie de fondo)
  - `--card: #FFFFFF`
  - `--foreground: #050505`
  - `--muted-foreground: #65676B`
  - `--border: #E4E6EB` (hairline)
  - Verde de éxito para check (#42A65A aprox.)
- **Radius:** 8–12px. **Sombras:** suaves, no glassmorphism, no gradientes en botones excepto el azul oficial.
- **Densidad:** cómoda, mucho whitespace, tipo Facebook Login / Business Integrations.
- **Mobile-first**; el flujo de conexión se ve excelente en desktop como tarjeta centrada (max-width 560px).
- Sin emojis excesivos. Sin dark-neon. Sin Lorem ipsum.

## Rutas

### `/` — Landing marketing (una pantalla)
- Headline (ES): "Conecta tu Página de Facebook. El agente responde en Messenger."
- CTA primario: "Conectar Página" → `/conectar`
- CTA secundario: "Ver cómo funciona" → `/como-funciona`
- Footer: "Allia2 no está afiliado a Meta Platforms, Inc."

### `/conectar` — Flujo de integración (núcleo del producto)
Flujo de 4 pasos con state machine local (React state, sin backend):

**Step 0 — Gate**
- Tarjeta título: "Conectar Messenger"
- Texto: "Allia2 solo puede leer y responder mensajes de la Página que autorices. Nunca pedimos tu contraseña de Facebook."
- Botón primario: "Continuar con Facebook" con logo estilo Facebook + botón azul.
- Fine print: "Serás enviado a Facebook para elegir la Página."

**Step 1 — Interstitial simulado de Facebook** (no falsificar URL de facebook.com)
- Modal/tarjeta titulada "Facebook" con estilo Login for Business:
  - App name: Allia2
  - "Allia2 quiere administrar mensajes de tus Páginas"
  - Checklist de permisos (no editable):
    - Ver la lista de Páginas
    - Leer y enviar mensajes de Messenger
    - Gestionar ajustes de mensajería
  - Texto: "Allia2 no publicará en tu muro ni verá tu contraseña."
  - Botones: "Cancelar" (outline) y "Continuar" (azul)

**Step 2 — Elegir Página**
- Lista de 3 páginas mock (Clínica Norte, Barbería Centro, Taller López): avatar circular, nombre, "Admin", radio select.
- Botón "Conectar esta Página" deshabilitado hasta seleccionar una.

**Step 3 — Éxito**
- Check verde. "Página conectada".
- Muestra: nombre de página, page_id mock, "Token guardado de forma segura".
- CTA: "Configurar ficha del negocio" → `/pages/$id`
- Secundario: "Conectar otra Página"

### `/pages` — Lista de páginas conectadas
- Cards/tabla: avatar, nombre, estado (Conectada / Agente activo / Desconectada), última hora de mensaje mock, toggle.
- 1–2 páginas mock + estado vacío: ilustración simple + "Aún no hay Páginas. El cliente autoriza con un clic. Tú no pides la clave."

### `/pages/$id` — Workspace de página
- Nav lateral: Resumen, Ficha, Citas, Mensajes (placeholder "Próximamente: inbox de Messenger").
- **Resumen:** badge de conexión, "Última autorización hace 2 días", botón "Reconectar con Facebook" (mismo flujo), botón "Desconectar" con modal de confirmación.
- **Ficha:** business name, hours, services, greeting. Botón Guardar (local state).
- **Citas:** tabla mock Pendiente / Confirmada. Sin backend.
- **Mensajes:** placeholder "Próximamente: inbox de Messenger".

### `/como-funciona` — 4 pasos
- Explicación del flujo en 4 pasos.

## Comportamiento

- **State:** React local (useState/useReducer para el flujo de conexión). No backend real. No Lovable Cloud necesario (todo es mock/local).
- **`src/lib/facebookAuth.ts`:** archivo con TODO functions: `startFacebookLogin()`, `exchangeCode()`, `listPages()`, `subscribeWebhook()`. Solo stubs/TODOs.
- **Seguridad:** nunca mostrar campo de contraseña de Facebook. Nunca decir "oficial de Meta" como si Allia2 fuera Meta — decir "integración con Facebook".
- **Footer en todas las páginas:** "Allia2 no está afiliado a Meta Platforms, Inc."
- **Copy:** Español (México).

## Estructura de archivos

```
src/
  routes/
    __root.tsx          -> head: fuentes Inter, meta base, footer wrapper
    index.tsx           -> / landing
    conectar.tsx        -> /conectar flujo de conexión
    pages.tsx           -> /pages lista (layout)
    pages.index.tsx     -> /pages lista real
    pages.$id.tsx       -> /pages/$id workspace
    como-funciona.tsx   -> /como-funciona
  lib/
    facebookAuth.ts     -> TODO stubs
    mockData.ts         -> páginas mock, citas mock
  components/
    ConnectFlow.tsx     -> state machine del flujo /conectar
    FacebookLogo.tsx    -> logo Facebook inline SVG
    PageCard.tsx        -> card de página en lista
    Footer.tsx          -> footer de no afiliación
    Toggle.tsx          -> switch Agente ON/OFF
    Avatar.tsx          -> avatar circular
```

## SEO / head metadata

- Cada ruta con `head()` propio: title único, description, og:title, og:description.
- `/` → "Allia2 — Conecta tu Página de Facebook. El agente responde en Messenger."
- `/conectar` → "Conectar Página de Facebook — Allia2"
- `/pages` → "Tus Páginas conectadas — Allia2"
- `/pages/$id` → título dinámico con nombre de página
- `/como-funciona` → "Cómo funciona Allia2"

## Pasos de implementación

1. Configurar `src/styles.css` con tokens Meta (colores, radius, sombras).
2. Añadir fuente Inter vía `<link>` en `__root.tsx` head + footer global.
3. Crear `src/lib/facebookAuth.ts` (stubs TODO) y `src/lib/mockData.ts`.
4. Construir componentes base (Avatar, Toggle, FacebookLogo, Footer, PageCard).
5. Ruta `/` landing.
6. Ruta `/conectar` con ConnectFlow (4 pasos).
7. Ruta `/pages` (lista + estado vacío).
8. Ruta `/pages/$id` workspace con sub-nav.
9. Ruta `/como-funciona`.
10. Verificar build, typecheck y preview.

## Fuera de alcance

- No Instagram, WhatsApp, Ads Manager, ni CRM completo.
- No SDK real de Facebook (solo stubs TODO).
- No backend/auth/base de datos en esta versión.
