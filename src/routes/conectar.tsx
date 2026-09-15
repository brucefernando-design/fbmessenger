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
    <div>
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-semibold text-foreground">
            Allia2
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
