import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageCard } from "@/components/PageCard";
import { updatePage, useStoredPages } from "@/lib/pageStore";

export const Route = createFileRoute("/pages/")({
  head: () => ({
    meta: [
      { title: "Tus Páginas conectadas — Allia2" },
      { name: "description", content: "Administra tus Páginas de Facebook conectadas a Allia2." },
      { property: "og:title", content: "Tus Páginas conectadas — Allia2" },
      { property: "og:description", content: "Administra tus Páginas de Facebook conectadas a Allia2." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PagesList,
});

interface ApiPage { id: string; name: string; }

function PagesList() {
  const { pages: mockPages, loaded: mockLoaded } = useStoredPages();
  const [apiPages, setApiPages] = useState<ApiPage[] | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/facebook/pages")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { pages: ApiPage[] }) => { setApiPages(data.pages); setApiLoaded(true); })
      .catch(() => { setApiPages(null); setApiLoaded(true); });
  }, []);

  const handleToggleAgent = (id: string, enabled: boolean) => {
    updatePage(id, { agentEnabled: enabled, status: enabled ? "agente_activo" : "conectada" });
  };

  const useApi = apiLoaded && apiPages !== null && apiPages.length > 0;
  const loaded = useApi ? true : mockLoaded;
  const pages = useApi ? [] : mockPages;
  const count = useApi ? apiPages!.length : pages.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Páginas conectadas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count} {count === 1 ? "Página vinculada" : "Páginas vinculadas"} a Allia2
          </p>
        </div>
        <Link
          to="/conectar"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          + Conectar Página
        </Link>
      </div>

      {useApi && (
        <div className="space-y-3">
          {apiPages!.map((page) => (
            <button
              key={page.id}
              onClick={() => navigate({ to: "/pages/$id", params: { id: page.id } })}
              className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {page.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{page.name}</p>
                <p className="text-xs text-muted-foreground">ID: {page.id}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Conectada
              </span>
            </button>
          ))}
        </div>
      )}

      {!useApi && (
        <>
          {!loaded ? null : pages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {pages.map((page) => (
                <Link key={page.id} to="/pages/$id" params={{ id: page.id }} className="block">
                  <PageCard page={page} onToggleAgent={handleToggleAgent} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-card p-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <svg className="h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7l9 6 9-6M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-4 9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground">Aún no hay Páginas</h2>
      <p className="mt-2 text-sm text-muted-foreground">Conecta tu primera Página de Facebook.</p>
      <Link
        to="/conectar"
        className="mt-5 inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Conectar Página
      </Link>
    </div>
  );
}
