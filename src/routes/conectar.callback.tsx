import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { consumeCsrfState } from "@/lib/facebookAuth";

export const Route = createFileRoute("/conectar/callback")({
  head: () => ({
    meta: [{ title: "Conectando con Facebook — Allia2" }],
  }),
  component: CallbackPage,
});

type Status = "validating" | "exchanging" | "success" | "csrf_error" | "fb_error" | "exchange_error";

const REDIRECT_URI =
  (import.meta.env.VITE_FB_REDIRECT_URI as string | undefined) ??
  (typeof window !== "undefined" ? `${window.location.origin}/conectar/callback` : "");

function CallbackPage() {
  const navigate = useNavigate();
  const search = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const code = search.get("code");
  const stateParam = search.get("state");
  const errorParam = search.get("error");
  const errorDesc = search.get("error_description");

  const [status, setStatus] = useState<Status>("validating");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (errorParam) {
      setStatus("fb_error");
      setErrorMsg(errorDesc ?? errorParam);
      return;
    }

    const saved = consumeCsrfState();
    if (!saved || saved !== stateParam) {
      setStatus("csrf_error");
      return;
    }

    if (!code) {
      setStatus("fb_error");
      setErrorMsg("No se recibió el código de autorización.");
      return;
    }

    setStatus("exchanging");
    fetch("/api/facebook/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri: REDIRECT_URI }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(() => {
        setStatus("success");
        setTimeout(() => navigate({ to: "/pages" }), 1500);
      })
      .catch((err: Error) => {
        setStatus("exchange_error");
        const msg = err.message;
        setErrorMsg(
          msg.includes("404") || msg.includes("Failed to fetch") || msg.includes("NetworkError")
            ? "El servidor de intercambio no está disponible. Levanta `npm run server`."
            : "Error al canjear el código con el servidor.",
        );
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">A2</span>
            <span className="text-sm font-semibold text-foreground">Allia2</span>
          </Link>
        </div>
      </div>

      <div className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-5xl px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Paso real de Facebook. El token lo guarda el servidor, no esta página.
          </p>
        </div>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {(status === "validating" || status === "exchanging") && (
            <Card>
              <div className="px-6 py-10 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="mt-4 text-sm text-muted-foreground">
                  {status === "validating" ? "Verificando autorización…" : "Canjeando en el servidor…"}
                </p>
              </div>
            </Card>
          )}

          {status === "success" && (
            <Card>
              <div className="px-6 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <svg className="h-7 w-7 text-success" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h1 className="mt-4 text-xl font-bold text-foreground">Página conectada</h1>
                <p className="mt-2 text-sm text-muted-foreground">Redirigiendo a tus Páginas…</p>
              </div>
            </Card>
          )}

          {status === "fb_error" && (
            <ErrCard title="No se conectó la Página" description={errorMsg || "Cerraste el diálogo antes de autorizar."}>
              <Link to="/conectar" className={btnPrimary}>Reintentar</Link>
            </ErrCard>
          )}

          {status === "csrf_error" && (
            <ErrCard title="Error de seguridad" description="El parámetro state no coincide. Inicia el flujo de nuevo desde Allia2.">
              <Link to="/conectar" className={btnPrimary}>Volver a conectar</Link>
            </ErrCard>
          )}

          {status === "exchange_error" && (
            <ErrCard title="Error al conectar" description={errorMsg}>
              <div className="flex flex-col gap-2">
                <Link to="/conectar" className={btnPrimary}>Reintentar</Link>
                <Link to="/pages" className={btnSecondary}>Volver a Páginas</Link>
              </div>
            </ErrCard>
          )}
        </div>
      </main>
    </div>
  );
}

const btnPrimary = "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90";
const btnSecondary = "inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent";

function ErrCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="px-6 pt-8 pb-4 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <svg className="h-7 w-7 text-destructive" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="border-t border-border px-6 py-4 text-center">{children}</div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)]">
      {children}
    </div>
  );
}
