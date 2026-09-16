import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FacebookLogo } from "@/components/FacebookLogo";
import { startFacebookLogin } from "@/lib/facebookAuth";

export const Route = createFileRoute("/conectar/")({
  head: () => ({
    meta: [
      { title: "Conectar Página de Facebook — Allia2" },
      {
        name: "description",
        content: "Conecta tu Página de Facebook para que Allia2 responda mensajes en Messenger.",
      },
      { property: "og:title", content: "Conectar Página de Facebook — Allia2" },
      {
        property: "og:description",
        content: "Conecta tu Página de Facebook para que Allia2 responda mensajes en Messenger.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ConectarPage,
});

interface InviteClient {
  id: string;
  name: string;
  maxPages: number;
  usedPages: number;
  status: string;
  isPaused: boolean;
  isFull: boolean;
}

function ConectarPage() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<InviteClient | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const paramCode = search.get("code")?.trim().toUpperCase() || null;
    setCode(paramCode);

    if (!paramCode) {
      setLoading(false);
      setErrorMsg("Este enlace no es válido. Pide tu acceso a Allia2.");
      return;
    }

    fetch(`/api/invite/${paramCode}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.valid) {
          setErrorMsg(data.error || "Este enlace no es válido. Pide tu acceso a Allia2.");
          setClient(data.client || null);
        } else {
          setClient(data.client);
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg("No se pudo validar el enlace. Intenta de nuevo.");
        setLoading(false);
      });
  }, []);

  function handleContinue() {
    if (!code || !client) return;
    setRedirecting(true);
    startFacebookLogin(code);
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#F0F2F5]">
      {/* Top Navbar */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              A2
            </span>
            <span className="text-sm font-semibold text-foreground">Allia2 Messenger</span>
          </Link>
          <Link to="/pages" className="text-sm text-muted-foreground hover:text-foreground">
            Mis Páginas
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[500px]">
          {loading && (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Verificando enlace de acceso…</p>
            </div>
          )}

          {!loading && errorMsg && (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h1 className="mt-4 text-xl font-bold text-foreground">Acceso no disponible</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {errorMsg}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  to="/"
                  className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Ir al inicio
                </Link>
              </div>
            </div>
          )}

          {!loading && !errorMsg && client && (
            <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border pb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {client.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">{client.name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Enlace verificado
                  </span>
                </div>
              </div>

              <div className="py-5 space-y-3">
                <h2 className="text-base font-semibold text-foreground">Conectar con Facebook Messenger</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Al conectar, podrás seleccionar la Página que responderá automáticamente mediante el asistente de Allia2.
                </p>

                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Cupo de Páginas:</span>
                    <span className="font-semibold text-foreground font-mono">
                      {client.maxPages - client.usedPages} de {client.maxPages} disponible(s)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={redirecting}
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {redirecting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Abriendo Facebook…
                    </>
                  ) : (
                    <>
                      <FacebookLogo className="h-5 w-5" />
                      Continuar con Facebook
                    </>
                  )}
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Allia2 nunca te pedirá tu contraseña de Facebook.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
