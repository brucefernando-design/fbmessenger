/**
 * Local token-exchange server — port 8787.
 * Vite proxies /api -> this server.
 * Start: npm run server
 *
 * FB_APP_SECRET lives here ONLY. Never in src/ or VITE_ vars.
 */
import express from "express";
import cors from "cors";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Minimal .env loader — no extra deps
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

const env = { ...process.env, ...loadEnv() };
const { FB_APP_ID, FB_APP_SECRET } = env;
const PORT = parseInt(env.SERVER_PORT ?? "8787", 10);

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

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// GET /api/facebook/pages
app.get("/api/facebook/pages", (_req, res) => {
  res.json({ pages: readPages().map(({ id, name }) => ({ id, name })) });
});

// POST /api/facebook/exchange
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

    // 4. Respond with ONLY id + name — never tokens to the browser
    res.json({ pages: fbPages.map(({ id, name }) => ({ id, name })) });
  } catch (err) {
    console.error("[exchange]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
  if (!FB_APP_ID || !FB_APP_SECRET)
    console.warn("[server] WARNING: FB_APP_ID / FB_APP_SECRET missing in .env");
});
