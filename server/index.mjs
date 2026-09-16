/**
 * Local Express server — port 8787.
 * Vite proxies /api -> this server.
 *
 * Secrets (FB_APP_SECRET, FB_VERIFY_TOKEN) live here ONLY.
 * Start: npm run server
 */
import express from "express";
import cors from "cors";
import http from "http";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Minimal .env loader ───────────────────────────────────────────────────────
function loadEnv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return {};
  const env = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx < 0) continue;
    env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return env;
}

const env = { ...process.env, ...loadEnv() };  // .env wins over process.env
const { FB_APP_ID, FB_APP_SECRET, FB_VERIFY_TOKEN } = env;
const PORT = parseInt(env.SERVER_PORT ?? "8787", 10);

console.log("[server] .env path:", join(ROOT, ".env"), "exists:", existsSync(join(ROOT, ".env")));
console.log("[server] FB_VERIFY_TOKEN loaded:", FB_VERIFY_TOKEN ? "YES (length=" + FB_VERIFY_TOKEN.length + ")" : "NO — check .env");

// ── Data helpers ──────────────────────────────────────────────────────────────
const DATA_DIR = join(ROOT, "data");
const PAGES_FILE = join(DATA_DIR, "pages.json");

const readPages = () => {
  if (!existsSync(PAGES_FILE)) return [];
  try { return JSON.parse(readFileSync(PAGES_FILE, "utf8")); } catch { return []; }
};

const writePages = (pages) => {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(PAGES_FILE, JSON.stringify(pages, null, 2), "utf8");
};

/** Returns the page access_token for a given page id, or null. */
const getPageToken = (pageId) => {
  const page = readPages().find((p) => p.id === pageId);
  return page?.access_token ?? null;
};

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: "*" }));

// Raw body needed for webhook signature verification in the future.
// express.json() is fine for now.
app.use(express.json());

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ── GET /api/facebook/pages ───────────────────────────────────────────────────
app.get("/api/facebook/pages", (_req, res) => {
  res.json({ pages: readPages().map(({ id, name }) => ({ id, name })) });
});

// ── GET /api/facebook/pages/:id ───────────────────────────────────────────────
app.get("/api/facebook/pages/:id", (req, res) => {
  const page = readPages().find((p) => p.id === req.params.id);
  if (!page) {
    return res.status(404).json({ error: "Página no encontrada" });
  }
  // Devolver info sin access_token
  res.json({ page: { id: page.id, name: page.name, category: page.category || "Página de Facebook" } });
});

// ── POST /api/facebook/exchange ───────────────────────────────────────────────
app.post("/api/facebook/exchange", async (req, res) => {
  const { code, redirectUri } = req.body ?? {};
  if (!code || !redirectUri)
    return res.status(400).json({ error: "Missing code or redirectUri" });
  if (!FB_APP_ID || !FB_APP_SECRET)
    return res.status(500).json({ error: "FB_APP_ID / FB_APP_SECRET not set in .env" });

  try {
    // 1. Exchange code -> user access token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", FB_APP_ID);
    tokenUrl.searchParams.set("client_secret", FB_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.href);
    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      return res.status(502).json({ error: "Facebook token exchange failed", detail: err });
    }
    const { access_token: userToken } = await tokenRes.json();

    // 2. GET /me/accounts
    const acctUrl = new URL("https://graph.facebook.com/v21.0/me/accounts");
    acctUrl.searchParams.set("access_token", userToken);
    acctUrl.searchParams.set("fields", "id,name,access_token");

    const acctRes = await fetch(acctUrl.href);
    if (!acctRes.ok) {
      const err = await acctRes.json().catch(() => ({}));
      return res.status(502).json({ error: "Failed to fetch pages", detail: err });
    }
    const { data: fbPages } = await acctRes.json();

    // 3. Persist to data/pages.json (gitignored)
    const existing = readPages();
    const updated = [...existing];
    for (const p of fbPages) {
      const i = updated.findIndex((e) => e.id === p.id);
      if (i >= 0) updated[i] = p; else updated.push(p);
    }
    writePages(updated);

    // 4. Respond ONLY id + name — never tokens to browser
    res.json({ pages: fbPages.map(({ id, name }) => ({ id, name })) });
  } catch (err) {
    console.error("[exchange]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/facebook/webhook — Meta verification challenge ───────────────────
app.get("/api/facebook/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === FB_VERIFY_TOKEN) {
    console.log("[webhook] Verification OK");
    return res.status(200).type("text/plain").send(challenge);
  }
  console.warn("[webhook] Verification FAILED — wrong token or mode");
  res.sendStatus(403);
});

// ── POST /api/facebook/webhook — incoming Messenger events ────────────────────
app.post("/api/facebook/webhook", async (req, res) => {
  // Respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  const body = req.body;
  if (body?.object !== "page") return;

  for (const entry of body.entry ?? []) {
    const pageId = entry.id;

    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id;
      const text     = event.message?.text;

      // Skip if sender is the Page itself (echo guard)
      if (senderId === pageId) continue;
      // Skip non-text events for now
      if (!text) continue;

      // Log — never log tokens
      console.log(`[webhook] pageId=${pageId} senderId=${senderId} text="${text}"`);

      // Echo reply if we have a page access token
      const pageToken = getPageToken(pageId);
      if (!pageToken) {
        console.warn(`[webhook] No token for page ${pageId} — skipping reply`);
        continue;
      }

      const replyText = `Allia2 recibió: ${text}`;
      try {
        const msgRes = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: replyText },
              access_token: pageToken,
            }),
          }
        );
        if (!msgRes.ok) {
          const err = await msgRes.json().catch(() => ({}));
          console.error("[webhook] Failed to send reply:", err);
        } else {
          console.log(`[webhook] Echo sent to ${senderId}`);
        }
      } catch (err) {
        console.error("[webhook] Network error sending reply:", err);
      }
    }
  }
});

// ── POST /api/facebook/subscribe — subscribe pages to webhook ─────────────────
app.post("/api/facebook/subscribe", async (_req, res) => {
  const pages = readPages();
  if (pages.length === 0) {
    return res.status(400).json({ ok: false, error: "No pages in data/pages.json" });
  }

  const results = [];
  for (const page of pages) {
    if (!page.access_token) {
      results.push({ id: page.id, name: page.name, ok: false, error: "no access_token" });
      continue;
    }
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscribed_fields: "messages,messaging_postbacks",
            access_token: page.access_token,
          }),
        }
      );
      const data = await subRes.json().catch(() => ({}));
      if (!subRes.ok || data.error) {
        results.push({ id: page.id, name: page.name, ok: false, error: data.error?.message ?? "unknown" });
      } else {
        results.push({ id: page.id, name: page.name, ok: true });
        console.log(`[subscribe] Page ${page.name} (${page.id}) subscribed OK`);
      }
    } catch (err) {
      results.push({ id: page.id, name: page.name, ok: false, error: err.message });
    }
  }

  const allOk = results.every((r) => r.ok);
  res.json({ ok: allOk, pages: results });
});

// ── Frontend in Production (Nitro SSR + Static Fallback) ─────────────────────
const NITRO_ENTRY = join(ROOT, ".output", "server", "index.mjs");
const NITRO_PORT = 8788;
let nitroStarted = false;

if (existsSync(NITRO_ENTRY)) {
  process.env.NITRO_PORT = String(NITRO_PORT);
  process.env.NITRO_HOST = "127.0.0.1";
  const nitroUrl = "file://" + (process.platform === "win32" ? "/" : "") + NITRO_ENTRY.replace(/\\/g, "/");
  import(nitroUrl)
    .then(() => {
      nitroStarted = true;
      console.log(`[server] Nitro SSR started on port ${NITRO_PORT}`);
    })
    .catch((err) => {
      console.error("[server] Failed to start Nitro SSR:", err);
    });

  // Forward all non-API requests to Nitro SSR
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    const proxyReq = http.request(
      {
        hostname: "127.0.0.1",
        port: NITRO_PORT,
        path: req.originalUrl,
        method: req.method,
        headers: {
          ...req.headers,
          host: req.headers.host,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", () => {
      // If Nitro is still initializing, fallback to static assets
      next();
    });

    if (req.method !== "GET" && req.method !== "HEAD") {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  });
}

const PUBLIC_DIR = existsSync(join(ROOT, ".output", "public"))
  ? join(ROOT, ".output", "public")
  : existsSync(join(ROOT, "dist"))
  ? join(ROOT, "dist")
  : null;

if (PUBLIC_DIR) {
  app.use(express.static(PUBLIC_DIR));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    const staticIndex = join(PUBLIC_DIR, "index.html");
    if (existsSync(staticIndex)) {
      return res.sendFile(staticIndex);
    }
    res.status(404).send("Not found");
  });
  console.log(`[server] Serving static assets from ${PUBLIC_DIR}`);
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  console.log(`[server] Listening on http://127.0.0.1:${PORT}`);
  console.log("[server] Routes registered:");
  console.log("  GET  /api/health");
  console.log("  GET  /api/facebook/pages");
  console.log("  GET  /api/facebook/pages/:id");
  console.log("  POST /api/facebook/exchange");
  console.log("  GET  /api/facebook/webhook  ← Meta verify challenge");
  console.log("  POST /api/facebook/webhook  ← incoming messages");
  console.log("  POST /api/facebook/subscribe");
  if (!FB_APP_ID || !FB_APP_SECRET)
    console.warn("[server] WARNING: FB_APP_ID / FB_APP_SECRET missing in .env");
  if (!FB_VERIFY_TOKEN)
    console.warn("[server] WARNING: FB_VERIFY_TOKEN missing in .env — GET /api/facebook/webhook will always 403");
});
