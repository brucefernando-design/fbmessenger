import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { consumeCsrfState, exchangeCode } from "@/lib/facebookAuth";

export const Route = createFileRoute("/conectar/callback")({
  head: () => ({
    meta: [{ title: "Conectando con Facebook — Allia2" }],
  }),
  component: CallbackPage,
});

type Status =
  | "validating"
  | "exchanging"
  | "pending_backend"
  | "csrf_error"
  | "fb_error"
  | "unknown_error";

function CallbackPage() {
  const search = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const code = search.get("code");
  const stateParam = search.get("state");
  const errorParam = search.get("error");
  const errorDesc = search.get("error_description");

  const [status, setStatus] = useState<Status>("validating");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    // Caso: usuario canceló en el diálogo de Facebook
    if (errorParam) {
      setStatus("fb_error");
      setDetail(errorDesc ?? errorParam);
      return;
    }

    // Validar state CSRF
    const saved = consumeCsrfState();
    if (!saved || saved !== stateParam) {
      setStatus("csrf_error");
      return;
    }

    if (!code) {
      setStatus("unknown_error");
      setDetail("No se recibió el código de autorización.");
      return;
    }

    // Intentar canjear el código — el backend aún no existe
    setStatus("exchanging");
    exchangeCode(code)
      .then(() => {
        // Si el backend existiera y respondiera OK, aquí navegaríamos a /pages
      })
      .catch((err: Error) => {
        // Tanto "backend_not_implemented" como "exchange_failed:NNN" llegan aquí
        setStatus("pending_backend");
        setDetail(err.message);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-1 flex-col">
      {/* Nav mínimo */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              A2
            </span>
            <span className="text-sm font-semibold text-foreground">Allia2</span>
          </Link>
        </div>
      </div>

      {/* Banner informativo */}
      <div className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-5xl px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Paso real de Facebook. El token lo guarda el servidor, no esta página.
          </p>
        </div>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {status === "validating" || status === "exchanging" ? (
            <LoadingCard />
          ) : status === "fb_error" ? (
            <ErrorCard
              title="No se conectó la Página"
              description={
                detail
                  ? `Facebook informó: ${detail}`
                  : "Cerraste el diálogo antes de autorizar el permiso."
              }
              action={
                <Link
                  to="/conectar"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Reintentar
                </Link>
              }
            />
          ) : status === "csrf_error" ? (
            <ErrorCard
              title="Error de seguridad"
              description="El parámetro state no coincide con el enviado. Puede ser un intento de CSRF. Inicia el flujo de nuevo desde Allia2."
              action={
                <Link
                  to="/conectar"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Volver a conectar
                </Link>
              }
            />
          ) : status === "pending_backend" ? (
            <PendingBackendCard code={code ?? ""} />
          ) : (
            <ErrorCard
              title="Error inesperado"
              description={detail || "Algo salió mal. Intenta de nuevo."}
              action={
                <Link
                  to="/conectar"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Reintentar
                </Link>
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <div className="px-6 py-10 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Verificando autorización…</p>
      </div>
    </Card>
  );
}

function PendingBackendCard({ code }: { code: string }) {
  return (
    <Card>
      <div className="px-6 pt-8 pb-4">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <svg className="h-7 w-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-center text-xl font-bold text-foreground">Código recibido</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
          Facebook autorizó correctamente. Falta el servidor para canjear el código por un token.
          No se guardó ningún token en esta página.
        </p>

        {/* Muestra el code truncado solo para debugging en dev */}
        {import.meta.env.DEV && code && (
          <div className="mt-4 rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">code (solo en dev):</p>
            <p className="mt-1 break-all font-mono text-xs text-foreground">
              {code.slice(0, 40)}…
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border px-6 py-4">
        <Link
          to="/pages"
          className="block w-full rounded-lg border border-border bg-card px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Volver a Páginas
        </Link>
      </div>
    </Card>
  );
}

function ErrorCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
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
      <div className="border-t border-border px-6 py-4 text-center">{action}</div>
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

