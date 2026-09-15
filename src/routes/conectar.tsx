import { Link, createFileRoute } from "@tanstack/react-router";
import { ConnectFlow } from "@/components/ConnectFlow";

export const Route = createFileRoute("/conectar")({
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

function ConectarPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              A2
            </span>
            <span className="text-sm font-semibold text-foreground">Allia2</span>
          </Link>
          <Link to="/pages" className="text-sm text-muted-foreground hover:text-foreground">
            Mis Páginas
          </Link>
        </div>
      </div>
      <ConnectFlow />
    </div>
  );
}
