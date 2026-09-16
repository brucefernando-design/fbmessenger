import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { consumeCsrfState, getRedirectUri, getStoredInviteCode, clearStoredInviteCode } from "@/lib/facebookAuth";

export const Route = createFileRoute("/conectar/callback")({
  head: () => ({
    meta: [{ title: "Conectando con Facebook — Allia2" }],
  }),
  component: CallbackPage,
});

type Status =
  | "validating"
  | "exchanging"
  | "choosing"
  | "claiming"
  | "success"
  | "csrf_error"
  | "fb_error"
  | "exchange_error"
  | "claim_error";

interface CandidatePage {
  id: string;
  name: string;
}

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
  const [claimSessionId, setClaimSessionId] = useState<string>("");
  const [candidatePages, setCandidatePages] = useState<CandidatePage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");

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

    const codeFromStorage = getStoredInviteCode() || "";
    setInviteCode(codeFromStorage);

    if (!codeFromStorage) {
      setStatus("exchange_error");
      setErrorMsg("No se encontró el código de invitación. Por favor inicia desde tu enlace de acceso.");
      return;
    }

    setStatus("exchanging");
    fetch("/api/facebook/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirectUri: getRedirectUri(),
        inviteCode: codeFromStorage,
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return body;
      })
      .then((data) => {
        if (!data.candidatePages || data.candidatePages.length === 0) {
          throw new Error("No se encontraron Páginas de Facebook en esta cuenta.");
        }
        setClaimSessionId(data.claimSessionId);
        setCandidatePages(data.candidatePages);
        setSelectedPageId(data.candidatePages[0].id);
        setStatus("choosing");
      })
      .catch((err: Error) => {
        setStatus("exchange_error");
        setErrorMsg(err.message || "Error al canjear el código con el servidor.");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleClaim() {
    if (!claimSessionId || !selectedPageId) return;

    setStatus("claiming");
    try {
      const res = await fetch("/api/facebook/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimSessionId,
          pageId: selectedPageId,
          inviteCode,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Error al vincular la Página seleccionada.");
      }

      clearStoredInviteCode();
      setStatus("success");
      setTimeout(() => navigate({ to: "/pages" }), 1500);
    } catch (err: any) {
      setStatus("claim_error");
      setErrorMsg(err.message || "Error al vincular la Página.");
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-[#F0F2F5] min-h-screen">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">A2</span>
            <span className="text-sm font-semibold text-foreground">Allia2 Messenger</span>
          </Link>
        </div>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {(status === "validating" || status === "exchanging") && (
            <Card>
              <div className="px-6 py-10 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="mt-4 text-sm text-muted-foreground">
                  {status === "validating" ? "Verificando autorización…" : "Obteniendo tus Páginas de Facebook…"}
                </p>
              </div>
            </Card>
          )}

          {status === "choosing" && (
            <Card>
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <h1 className="text-xl font-bold text-foreground">Selecciona tu Página</h1>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Solo se vinculará la Página que elijas para responder mensajes en Messenger. El resto de tus Páginas no se guardarán.
                </p>
              </div>

              <div className="px-6 py-4 space-y-2 max-h-72 overflow-y-auto">
                {candidatePages.map((page) => (
                  <label
                    key={page.id}
                    className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedPageId === page.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-secondary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="selected_page"
                      value={page.id}
                      checked={selectedPageId === page.id}
                      onChange={() => setSelectedPageId(page.id)}
                      className="h-4 w-4 text-primary border-border focus:ring-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{page.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">ID: {page.id}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={!selectedPageId}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Conectar esta Página
                </button>
              </div>
            </Card>
          )}

          {status === "claiming" && (
            <Card>
              <div className="px-6 py-10 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="mt-4 text-sm text-muted-foreground">Vinculando Página a Allia2…</p>
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
                <h1 className="mt-4 text-xl font-bold text-foreground">Página vinculada con éxito</h1>
                <p className="mt-2 text-sm text-muted-foreground">Redirigiendo a tu espacio de trabajo…</p>
              </div>
            </Card>
          )}

          {status === "fb_error" && (
            <ErrCard title="No se conectó la Página" description={errorMsg || "Cerraste el diálogo antes de autorizar."}>
              <Link to="/" className={btnPrimary}>Volver al inicio</Link>
            </ErrCard>
          )}

          {status === "csrf_error" && (
            <ErrCard title="Error de seguridad" description="El parámetro de sesión no coincide. Inicia el flujo de nuevo desde tu enlace de invitación.">
              <Link to="/" className={btnPrimary}>Volver al inicio</Link>
            </ErrCard>
          )}

          {status === "exchange_error" && (
            <ErrCard title="Error al conectar" description={errorMsg}>
              <div className="flex flex-col gap-2">
                <Link to="/" className={btnPrimary}>Ir al inicio</Link>
              </div>
            </ErrCard>
          )}

          {status === "claim_error" && (
            <ErrCard title="Error al vincular Página" description={errorMsg}>
              <button onClick={() => setStatus("choosing")} className={btnPrimary}>
                Reintentar elección
              </button>
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
