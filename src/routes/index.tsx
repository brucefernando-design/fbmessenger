import { Link, createFileRoute } from "@tanstack/react-router";
import { FacebookLogo } from "@/components/FacebookLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Allia2 — Conecta tu Página de Facebook. El agente responde en Messenger." },
      {
        name: "description",
        content:
          "Allia2 conecta tu Página de Facebook y responde mensajes en Messenger por ti. El cliente autoriza con un clic; tú no pides la clave.",
      },
      { property: "og:title", content: "Allia2 — Conecta tu Página de Facebook" },
      {
        property: "og:description",
        content:
          "Allia2 conecta tu Página de Facebook y responde mensajes en Messenger por ti. Sin contraseña.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              A2
            </span>
            <span className="text-sm font-semibold text-foreground">Allia2</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/como-funciona" className="text-sm text-muted-foreground hover:text-foreground">
              Cómo funciona
            </Link>
            <Link to="/pages" className="text-sm text-muted-foreground hover:text-foreground">
              Mis Páginas
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">A2</span>
          </div>

          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Conecta tu Página de Facebook.
            <br />
            El agente responde en Messenger.
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Allia2 habla con tus clientes por Messenger cuando no puedes. El cliente autoriza con un
            clic — tú no pides la clave.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/conectar"
              className="flex items-center justify-center gap-2.5 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <FacebookLogo className="h-5 w-5" />
              Conectar Página
            </Link>
            <Link
              to="/como-funciona"
              className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Ver cómo funciona
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TrustBadge
              title="Sin contraseña"
              description="Nunca pedimos tu clave de Facebook."
            />
            <TrustBadge
              title="Tú decides"
              description="Activa o pausa el agente cuando quieras."
            />
            <TrustBadge
              title="Seguro"
              description="El token se guarda de forma segura."
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function TrustBadge({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-left">
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5 text-success" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
