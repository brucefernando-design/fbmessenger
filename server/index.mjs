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
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, chmodSync } from "fs";
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
const { FB_APP_ID, FB_APP_SECRET, FB_VERIFY_TOKEN, GEMINI_API_KEY, GEMINI_MODEL, ADMIN_KEY } = env;
const MODEL_NAME = GEMINI_MODEL || "gemini-2.5-flash-lite";
const EFFECTIVE_ADMIN_KEY = ADMIN_KEY || "allia2_admin_2026";
const PORT = parseInt(env.SERVER_PORT ?? "8787", 10);

console.log("[server] .env path:", join(ROOT, ".env"), "exists:", existsSync(join(ROOT, ".env")));
console.log("[server] FB_VERIFY_TOKEN loaded:", FB_VERIFY_TOKEN ? "YES (length=" + FB_VERIFY_TOKEN.length + ")" : "NO — check .env");
console.log("[server] GEMINI_API_KEY loaded:", GEMINI_API_KEY ? "YES (model=" + MODEL_NAME + ")" : "NO (echo fallback mode)");
console.log("[server] ADMIN_KEY loaded:", ADMIN_KEY ? "YES (custom)" : "YES (default)");

// ── Cookie parser helper (0 external dependencies) ───────────────────────────
function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts[0]?.trim();
    if (!name) return;
    const value = parts.slice(1).join("=").trim();
    try { list[name] = decodeURIComponent(value); } catch { list[name] = value; }
  });
  return list;
}

function generateClientCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let p1 = "";
  let p2 = "";
  for (let i = 0; i < 4; i++) p1 += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) p2 += chars[Math.floor(Math.random() * chars.length)];
  return `A2-${p1}-${p2}`;
}

// ── Data helpers (Clients & Pages stored together) ────────────────────────────
const DATA_DIR = join(ROOT, "data");
const PAGES_FILE = join(DATA_DIR, "pages.json");
const PROMPTS_FILE = join(DATA_DIR, "prompts.json");

function readData() {
  if (!existsSync(PAGES_FILE)) {
    return { clients: [], pages: [] };
  }
  try {
    const raw = JSON.parse(readFileSync(PAGES_FILE, "utf8"));
    if (Array.isArray(raw)) {
      // Legacy format migration
      const clientFta = {
        id: "client_fta_laredo",
        name: "Fta Laredo",
        code: "A2-FTAL-7359",
        maxPages: 1,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const pages = raw.map((p) => {
        if (p.id === "735987983143265") {
          return { ...p, clientId: clientFta.id };
        }
        return p;
      });
      const data = { clients: [clientFta], pages };
      writeData(data);
      return data;
    }
    const clients = Array.isArray(raw.clients) ? raw.clients : [];
    const pages = Array.isArray(raw.pages) ? raw.pages : [];

    // Guarantee Fta Laredo is preserved as client if page 735987983143265 is present
    const ftaPage = pages.find((p) => p.id === "735987983143265");
    if (ftaPage) {
      let ftaClient = clients.find((c) => c.id === ftaPage.clientId || c.name.toLowerCase().includes("fta"));
      if (!ftaClient) {
        ftaClient = {
          id: ftaPage.clientId || "client_fta_laredo",
          name: "Fta Laredo",
          code: "A2-FTAL-7359",
          maxPages: 1,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        clients.unshift(ftaClient);
      }
      ftaPage.clientId = ftaClient.id;
    }

    return { clients, pages };
  } catch (err) {
    console.error("[readData] Error:", err.message);
    return { clients: [], pages: [] };
  }
}

function writeData(data) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(PAGES_FILE, JSON.stringify(data, null, 2), "utf8");
  try { chmodSync(PAGES_FILE, 0o600); } catch {}
}

const readPages = () => readData().pages;
const writePages = (pages) => {
  const d = readData();
  d.pages = pages;
  writeData(d);
};

const readPrompts = () => {
  if (!existsSync(PROMPTS_FILE)) return {};
  try { return JSON.parse(readFileSync(PROMPTS_FILE, "utf8")); } catch { return {}; }
};

const writePrompts = (prompts) => {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(PROMPTS_FILE, JSON.stringify(prompts, null, 2), "utf8");
  try { chmodSync(PROMPTS_FILE, 0o600); } catch {}
};

/** Returns the page access_token for a given page id, or null. */
const getPageToken = (pageId) => {
  const page = readPages().find((p) => p.id === pageId);
  return page?.access_token ?? null;
};

// ── In-Memory Claim Sessions (OAuth exchange -> Claim page) ───────────────────
const claimSessions = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of claimSessions.entries()) {
    if (s.expiresAt < now) claimSessions.delete(id);
  }
}, 300000);

// ── Admin Auth Helper ─────────────────────────────────────────────────────────
function isAdmin(req) {
  const cookies = parseCookies(req);
  const token = cookies.a2_admin_session || req.headers["x-admin-key"];
  return Boolean(EFFECTIVE_ADMIN_KEY && token === EFFECTIVE_ADMIN_KEY);
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized: Admin session required" });
  }
  next();
}

function getClientCode(req) {
  const cookies = parseCookies(req);
  return req.headers["x-invite-code"] || req.query.code || cookies.a2_client_code || null;
}

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", gemini: Boolean(GEMINI_API_KEY) });
});

// ── POST /api/agent/preview — test AI response without Facebook ───────────────
app.post("/api/agent/preview", async (req, res) => {
  const { pageId, text } = req.body ?? {};
  if (!pageId || !text) {
    return res.status(400).json({ error: "pageId and text are required" });
  }

  const prompts = readPrompts();
  const pagePromptData = prompts[pageId] || {};
  const useCustom = pagePromptData.useCustom ?? true;
  const raw = pagePromptData.raw?.trim() || "";
  const generated = pagePromptData.generated?.trim() || "";

  let contextText = "";
  if (useCustom && generated) {
    contextText = generated;
  } else if (raw) {
    contextText = raw;
  }

  if (!contextText) {
    return res.json({ reply: "En un momento te atiende un asesor." });
  }

  if (!GEMINI_API_KEY) {
    return res.json({ reply: "En un momento te confirma un asesor." });
  }

  try {
    const aiReply = await generateAIResponse(text, contextText);
    res.json({ reply: aiReply || "En un momento te confirma un asesor." });
  } catch (err) {
    console.error("[preview] Error:", err.message);
    res.json({ reply: "En un momento te confirma un asesor." });
  }
});

// ── GET /api/invite/:code ─────────────────────────────────────────────────────
app.get("/api/invite/:code", (req, res) => {
  const code = (req.params.code || "").trim().toUpperCase();
  const { clients, pages } = readData();
  const client = clients.find((c) => c.code.toUpperCase() === code);
  if (!client) {
    return res.status(404).json({ valid: false, error: "Este enlace no es válido. Pide tu acceso a Allia2." });
  }

  const usedPages = pages.filter((p) => p.clientId === client.id).length;
  const isPaused = client.status === "paused";
  const isFull = usedPages >= client.maxPages;

  let message = "";
  if (isPaused) {
    message = "Este acceso está pausado temporalmente. Contacta a Allia2.";
  } else if (isFull) {
    message = `Ya se ha alcanzado el límite de Páginas para este acceso (${usedPages}/${client.maxPages}).`;
  }

  res.json({
    valid: !isPaused && !isFull,
    error: message || undefined,
    client: {
      id: client.id,
      name: client.name,
      maxPages: client.maxPages,
      usedPages,
      status: client.status,
      isPaused,
      isFull,
    },
  });
});

// ── Admin Endpoints ───────────────────────────────────────────────────────────
app.post("/api/admin/login", (req, res) => {
  const { key } = req.body ?? {};
  if (!key || key !== EFFECTIVE_ADMIN_KEY) {
    return res.status(401).json({ error: "Clave de administrador incorrecta" });
  }
  res.setHeader("Set-Cookie", `a2_admin_session=${EFFECTIVE_ADMIN_KEY}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
  res.json({ ok: true });
});

app.post("/api/admin/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "a2_admin_session=; Path=/; HttpOnly; Max-Age=0");
  res.json({ ok: true });
});

app.get("/api/admin/check", (req, res) => {
  res.json({ ok: true, authenticated: isAdmin(req) });
});

app.get("/api/admin/clients", requireAdmin, (_req, res) => {
  const { clients, pages } = readData();
  const clientsWithPages = clients.map((c) => {
    const assignedPages = pages.filter((p) => p.clientId === c.id).map(({ id, name }) => ({ id, name }));
    return {
      ...c,
      usedPages: assignedPages.length,
      pages: assignedPages,
    };
  });
  res.json({ ok: true, clients: clientsWithPages });
});

app.post("/api/admin/clients", requireAdmin, (req, res) => {
  const { name, maxPages } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "El nombre del cliente es requerido" });
  }

  const limit = Math.max(1, parseInt(maxPages, 10) || 1);
  const data = readData();
  const newClient = {
    id: "client_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    code: generateClientCode(),
    maxPages: limit,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.clients.unshift(newClient);
  writeData(data);
  res.json({ ok: true, client: newClient });
});

app.patch("/api/admin/clients/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, maxPages, status } = req.body ?? {};
  const data = readData();
  const client = data.clients.find((c) => c.id === id);
  if (!client) return res.status(404).json({ error: "Cliente no encontrado" });

  if (name && typeof name === "string") client.name = name.trim();
  if (maxPages !== undefined) client.maxPages = Math.max(1, parseInt(maxPages, 10) || 1);
  if (status === "active" || status === "paused") client.status = status;
  client.updatedAt = new Date().toISOString();

  writeData(data);
  res.json({ ok: true, client });
});

app.delete("/api/admin/clients/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = readData();
  const clientIdx = data.clients.findIndex((c) => c.id === id);
  if (clientIdx < 0) return res.status(404).json({ error: "Cliente no encontrado" });

  data.clients.splice(clientIdx, 1);
  for (const p of data.pages) {
    if (p.clientId === id) p.clientId = null;
  }
  writeData(data);
  res.json({ ok: true });
});

app.post("/api/admin/clients/:id/regenerate-code", requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = readData();
  const client = data.clients.find((c) => c.id === id);
  if (!client) return res.status(404).json({ error: "Cliente no encontrado" });

  client.code = generateClientCode();
  client.updatedAt = new Date().toISOString();
  writeData(data);
  res.json({ ok: true, code: client.code });
});

app.post("/api/admin/clients/:id/unlink-page/:pageId", requireAdmin, (req, res) => {
  const { id, pageId } = req.params;
  const data = readData();
  const page = data.pages.find((p) => p.id === pageId);
  if (!page) return res.status(404).json({ error: "Página no encontrada" });
  if (page.clientId === id) {
    page.clientId = null;
    writeData(data);
  }
  res.json({ ok: true });
});

app.post("/api/admin/clients/:id/link-page", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { pageId } = req.body ?? {};
  if (!pageId) return res.status(400).json({ error: "pageId es requerido" });

  const data = readData();
  const client = data.clients.find((c) => c.id === id);
  if (!client) return res.status(404).json({ error: "Cliente no encontrado" });

  const page = data.pages.find((p) => p.id === pageId);
  if (!page) return res.status(404).json({ error: "Página no encontrada" });

  const used = data.pages.filter((p) => p.clientId === client.id).length;
  if (used >= client.maxPages && page.clientId !== client.id) {
    return res.status(400).json({ error: `El cliente ya alcanzó su cupo máximo (${used}/${client.maxPages})` });
  }

  page.clientId = client.id;
  writeData(data);
  res.json({ ok: true });
});

app.get("/api/admin/pages", requireAdmin, (_req, res) => {
  const { pages } = readData();
  res.json({ ok: true, pages: pages.map(({ id, name, clientId }) => ({ id, name, clientId })) });
});

// ── GET /api/facebook/pages ───────────────────────────────────────────────────
app.get("/api/facebook/pages", (req, res) => {
  const { clients, pages } = readData();
  if (isAdmin(req)) {
    return res.json({ pages: pages.map(({ id, name }) => ({ id, name })) });
  }
  const code = getClientCode(req);
  if (!code) {
    return res.json({ pages: [] });
  }
  const client = clients.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  if (!client) {
    return res.json({ pages: [] });
  }
  const clientPages = pages.filter((p) => p.clientId === client.id);
  res.json({ pages: clientPages.map(({ id, name }) => ({ id, name })) });
});

// ── GET /api/facebook/pages/:id ───────────────────────────────────────────────
app.get("/api/facebook/pages/:id", (req, res) => {
  const { pages } = readData();
  const page = pages.find((p) => p.id === req.params.id);
  if (!page) {
    return res.status(404).json({ error: "Página no encontrada" });
  }
  // Devolver info sin access_token
  res.json({ page: { id: page.id, name: page.name, category: page.category || "Página de Facebook" } });
});

// ── GET /api/pages/:id/prompt ────────────────────────────────────────────────
app.get("/api/pages/:id/prompt", (req, res) => {
  const prompts = readPrompts();
  const pagePrompt = prompts[req.params.id] || {};
  res.json({
    raw: pagePrompt.raw || "",
    generated: pagePrompt.generated || "",
    useCustom: pagePrompt.useCustom ?? true,
    updatedAt: pagePrompt.updatedAt || "",
  });
});

// ── PUT /api/pages/:id/prompt ────────────────────────────────────────────────
app.put("/api/pages/:id/prompt", (req, res) => {
  const { raw, generated, useCustom } = req.body ?? {};
  if (raw !== undefined && (typeof raw !== "string" || raw.length > 20000)) {
    return res.status(400).json({ error: "raw must be string up to 20000 characters" });
  }
  if (generated !== undefined && (typeof generated !== "string" || generated.length > 20000)) {
    return res.status(400).json({ error: "generated must be string up to 20000 characters" });
  }
  const prompts = readPrompts();
  const existing = prompts[req.params.id] || {};
  prompts[req.params.id] = {
    raw: raw !== undefined ? raw : (existing.raw || ""),
    generated: generated !== undefined ? generated : (existing.generated || ""),
    useCustom: useCustom !== undefined ? Boolean(useCustom) : (existing.useCustom ?? true),
    updatedAt: new Date().toISOString(),
  };
  writePrompts(prompts);
  res.json({ ok: true, prompt: prompts[req.params.id] });
});

// ── POST /api/pages/:id/generate-prompt ──────────────────────────────────────
app.post("/api/pages/:id/generate-prompt", async (req, res) => {
  const { raw } = req.body ?? {};
  if (!raw || typeof raw !== "string") {
    return res.status(400).json({ error: "raw is required and must be a string" });
  }
  if (raw.length > 20000) {
    return res.status(400).json({ error: "raw exceeds 20000 characters limit" });
  }
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: "GEMINI_API_KEY no configurada en el servidor" });
  }
  try {
    const generated = await generateStructuredPrompt(raw);
    res.json({ generated });
  } catch (err) {
    console.error("[generate-prompt] Error:", err.message);
    res.status(500).json({ error: "Error al generar prompt con Gemini" });
  }
});

// ── POST /api/facebook/exchange ───────────────────────────────────────────────
app.post("/api/facebook/exchange", async (req, res) => {
  const { code, redirectUri, inviteCode } = req.body ?? {};
  if (!code || !redirectUri)
    return res.status(400).json({ error: "Missing code or redirectUri" });
  if (!inviteCode || typeof inviteCode !== "string")
    return res.status(403).json({ error: "Se requiere un código de invitación válido para conectar una Página." });
  if (!FB_APP_ID || !FB_APP_SECRET)
    return res.status(500).json({ error: "FB_APP_ID / FB_APP_SECRET not set in .env" });

  const cleanCode = inviteCode.trim().toUpperCase();
  const { clients, pages } = readData();
  const client = clients.find((c) => c.code.toUpperCase() === cleanCode);
  if (!client) {
    return res.status(403).json({ error: "Código de invitación no válido o inexistente." });
  }
  if (client.status === "paused") {
    return res.status(403).json({ error: "Este acceso está pausado temporalmente. Contacta a Allia2." });
  }
  const usedPages = pages.filter((p) => p.clientId === client.id).length;
  if (usedPages >= client.maxPages) {
    return res.status(403).json({ error: `El cupo de Páginas para este acceso está lleno (${usedPages}/${client.maxPages}).` });
  }

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

    if (!Array.isArray(fbPages) || fbPages.length === 0) {
      return res.status(400).json({ error: "No se encontraron Páginas de Facebook administradas con esta cuenta." });
    }

    // 3. DO NOT persist all pages to disk yet! Store temporarily in claim session
    const claimSessionId = "claim_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    claimSessions.set(claimSessionId, {
      candidatePages: fbPages,
      inviteCode: cleanCode,
      clientId: client.id,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    // 4. Return candidate pages (never tokens) and claimSessionId
    res.json({
      ok: true,
      claimSessionId,
      candidatePages: fbPages.map(({ id, name }) => ({ id, name })),
      client: { name: client.name, maxPages: client.maxPages, usedPages },
    });
  } catch (err) {
    console.error("[exchange]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/facebook/claim ──────────────────────────────────────────────────
app.post("/api/facebook/claim", async (req, res) => {
  const { claimSessionId, pageId, inviteCode } = req.body ?? {};
  if (!claimSessionId || !pageId) {
    return res.status(400).json({ error: "claimSessionId and pageId are required" });
  }

  const session = claimSessions.get(claimSessionId);
  if (!session || session.expiresAt < Date.now()) {
    return res.status(400).json({ error: "La sesión de conexión expiró. Por favor vuelve a conectar con tu enlace." });
  }

  const codeToVerify = (inviteCode || session.inviteCode || "").trim().toUpperCase();
  const data = readData();
  const client = data.clients.find((c) => c.code.toUpperCase() === codeToVerify);
  if (!client) {
    return res.status(403).json({ error: "Código de cliente inválido o no encontrado" });
  }
  if (client.status === "paused") {
    return res.status(403).json({ error: "Este acceso está pausado temporalmente" });
  }

  const usedPages = data.pages.filter((p) => p.clientId === client.id).length;
  if (usedPages >= client.maxPages) {
    return res.status(403).json({ error: `El cupo de Páginas para este cliente ya está lleno (${usedPages}/${client.maxPages})` });
  }

  const chosenPage = session.candidatePages.find((p) => p.id === pageId);
  if (!chosenPage) {
    return res.status(400).json({ error: "Página no encontrada en la sesión actual" });
  }

  // Persist ONLY this chosen page
  const existingIdx = data.pages.findIndex((p) => p.id === pageId);
  const pageRecord = {
    id: chosenPage.id,
    name: chosenPage.name,
    access_token: chosenPage.access_token,
    clientId: client.id,
    connectedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    data.pages[existingIdx] = pageRecord;
  } else {
    data.pages.push(pageRecord);
  }
  writeData(data);

  // Auto-subscribe page to webhook in Meta
  try {
    const subRes = await fetch(
      `https://graph.facebook.com/v21.0/${chosenPage.id}/subscribed_apps`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscribed_fields: "messages,messaging_postbacks",
          access_token: chosenPage.access_token,
        }),
      }
    );
    const subData = await subRes.json().catch(() => ({}));
    console.log(`[claim] Subscribed page ${chosenPage.id} result:`, subData);
  } catch (err) {
    console.warn(`[claim] Auto-subscribe warning for ${chosenPage.id}:`, err.message);
  }

  // Delete claim session
  claimSessions.delete(claimSessionId);

  // Set client cookie (1 year)
  res.setHeader("Set-Cookie", `a2_client_code=${client.code}; Path=/; SameSite=Lax; Max-Age=31536000`);
  res.json({ ok: true, page: { id: pageRecord.id, name: pageRecord.name } });
});

// ── GET /api/facebook/webhook — Meta verification challenge ───────────────────
// ── Gemini AI Assistant ───────────────────────────────────────────────────────
const ALLIA2_SYSTEM_RULES = `Eres el asistente oficial de Allia2 para Facebook Messenger de este negocio.
REGLAS OBLIGATORIAS (siempre aplican, máxima prioridad):
1. Responde siempre en Español de México, en tono amable y profesional, y de forma breve (estilo WhatsApp/Messenger: 1 a 3 párrafos cortos).
2. NUNCA inventes precios, horarios ni disponibilidad. Si la información no está explícitamente en el texto del negocio, di cordialmente que un humano lo confirmará.
3. NUNCA pidas contraseñas de Facebook ni credenciales sensibles.
4. NUNCA des diagnósticos médicos ni legales definitivos.
5. Si piden hablar con un humano o presentan una queja, ofrece cordialmente que un asesor se comunicará con ellos.`;

async function generateAIResponse(userText, pageInstructions) {
  if (!GEMINI_API_KEY) {
    return null; // Fallback to echo if no key
  }

  const systemInstruction = `${ALLIA2_SYSTEM_RULES}\n\nTEXTO Y REGLAS DEL NEGOCIO:\n${pageInstructions || "No hay texto adicional configurado. Saluda amablemente y ofrece ayuda básica."}`;

  // Models to attempt: primary configured, then fallbacks if model is retired/unavailable
  const modelsToTry = [MODEL_NAME, "gemini-2.5-flash", "gemini-3.5-flash-lite"];
  const uniqueModels = [...new Set(modelsToTry)];

  for (const model of uniqueModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(`[gemini] Model ${model} returned ${res.status}:`, errText);
        if (res.status === 404) continue; // Try fallback model if retired
        return "En un momento te confirma un asesor.";
      }

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) return reply;
    } catch (err) {
      console.error(`[gemini] Error with model ${model}:`, err.message);
      return "En un momento te confirma un asesor.";
    }
  }

  return "En un momento te confirma un asesor.";
}

async function generateStructuredPrompt(rawText) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no configurada en el servidor");
  }

  const promptInstruction = `Eres un experto en diseñar instrucciones (prompts) para agentes de atención al cliente en Facebook Messenger.
A partir de la siguiente información proporcionada por el dueño de un negocio, estructura un conjunto de instrucciones claro, conciso y profesional para el agente de IA.

REGLAS OBLIGATORIAS:
1. NO inventes información, precios, direcciones ni horarios que no estén presentes en el texto original.
2. Si el texto no menciona ciertos datos clave, instruye al agente a indicar amablemente al cliente que un asesor humano le confirmará los detalles.
3. Organiza la información con claridad:
   - Identidad y tono del negocio
   - Servicios / Productos ofrecidos
   - Precios y métodos de pago (solo los mencionados)
   - Horarios y ubicación (solo los mencionados)
   - Escalamiento a asesor humano cuando no se tenga la respuesta
4. Responde ÚNICAMENTE con el prompt generado, sin comentarios ni preámbulos.

Información del negocio:
${rawText}`;

  const modelsToTry = [MODEL_NAME, "gemini-2.5-flash", "gemini-3.5-flash-lite"];
  const uniqueModels = [...new Set(modelsToTry)];

  for (const model of uniqueModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: promptInstruction }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.2 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(`[generateStructuredPrompt] Model ${model} returned ${res.status}:`, errText);
        if (res.status === 404) continue;
        throw new Error(`Gemini API returned ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) return reply;
    } catch (err) {
      console.error(`[generateStructuredPrompt] Error with model ${model}:`, err.message);
      if (model === uniqueModels[uniqueModels.length - 1]) throw err;
    }
  }

  throw new Error("No se pudo generar el prompt con los modelos disponibles");
}

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

      // Page token check
      const pageToken = getPageToken(pageId);
      if (!pageToken) {
        console.warn(`[webhook] No token for page ${pageId} — skipping reply`);
        continue;
      }

      // Check if client is paused — if paused, do not reply
      const { clients, pages } = readData();
      const pageObj = pages.find((p) => p.id === pageId);
      if (pageObj?.clientId) {
        const clientObj = clients.find((c) => c.id === pageObj.clientId);
        if (clientObj && clientObj.status === "paused") {
          console.log(`[webhook] Client "${clientObj.name}" (${clientObj.id}) is paused — skipping reply`);
          continue;
        }
      }

      // Resolve context for page
      const prompts = readPrompts();
      const pagePromptData = prompts[pageId] || {};
      const useCustom = pagePromptData.useCustom ?? true;
      const raw = pagePromptData.raw?.trim() || "";
      const generated = pagePromptData.generated?.trim() || "";

      let contextText = "";
      if (useCustom && generated) {
        contextText = generated;
      } else if (raw) {
        contextText = raw;
      }

      let replyText;
      if (!contextText) {
        replyText = "En un momento te atiende un asesor.";
      } else if (!GEMINI_API_KEY) {
        replyText = "En un momento te confirma un asesor.";
      } else {
        const aiReply = await generateAIResponse(text, contextText);
        replyText = aiReply || "En un momento te confirma un asesor.";
      }

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
          console.log(`[webhook] Sent reply to ${senderId}: "${replyText.slice(0, 60)}..."`);
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

process.on("SIGTERM", () => {
  console.log("[server] Received SIGTERM, shutting down cleanly");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[server] Received SIGINT, shutting down cleanly");
  process.exit(0);
});
