# Plan: Messenger IA

## Resumen

App de mensajería donde el usuario conversa con un asistente de IA en una interfaz estilo chat (tipo WhatsApp/Messenger). Las respuestas de IA se generan con Lovable AI Gateway. El historial de chat se guarda en la sesión del navegador (sin cuentas por ahora).

## Decisiones por defecto (el usuario saltó las preguntas)

- **Tipo:** Chatbot conversacional — el usuario habla con un solo asistente de IA.
- **Usuarios:** Sin cuentas ni login. Sesión temporal en el navegador; el historial se guarda en localStorage.
- **IA:** Lovable AI Gateway (chat completions) para las respuestas del asistente.

## Lo que se va a construir

### 1. Pantalla principal de chat (`src/routes/index.tsx`)
- Interfaz de chat estilo mensajería: burbujas de mensajes (usuario a la derecha, IA a la izquierda).
- Campo de texto en la parte inferior para escribir mensajes + botón de enviar.
- Indicador de "escribiendo…" mientras la IA responde.
- Historial de mensajes persistente en localStorage (se mantiene al recargar).
- Botón para limpiar/borrar la conversación.
- Cabecera con el nombre "Messenger IA" y un avatar del asistente.

### 2. Lógica de IA (server function)
- `src/lib/chat.functions.ts` — server function que llama a Lovable AI Gateway con el historial de mensajes y devuelve la respuesta del asistente.
- El asistente tiene un nombre/personalidad simple configurable.

### 3. Diseño visual
- Como el usuario no especificó dirección visual, generaré 3 opciones de diseño (design directions) y el usuario eligirá una antes de construir.
- Estilo general: moderno, oscuro o claro, tipo app de mensajería.

## Infraestructura

- **Lovable Cloud** se activará para usar Lovable AI Gateway (chat completions) — no necesita base de datos ni auth para esta versión.
- No se necesita Supabase ni tablas (el historial vive en localStorage).

## Pasos de implementación

1. Activar Lovable Cloud (para AI Gateway).
2. Generar 3 design directions y dejar que el usuario elija.
3. Construir la pantalla de chat con la dirección elegida.
4. Implementar el server function de chat con AI Gateway.
5. Conectar el envío de mensajes del UI con el server function.
6. Probar el flujo completo en el preview.

## Pendiente

- Elegir dirección de diseño (3 opciones) — se hace al iniciar la construcción.
