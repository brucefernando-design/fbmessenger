import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Toggle } from "./Toggle";
import type { MockPage } from "@/lib/mockData";

interface PageCardProps {
  page: MockPage;
  onToggleAgent: (id: string, enabled: boolean) => void;
}

const statusConfig: Record<MockPage["status"], { label: string; className: string }> = {
  agente_activo: { label: "Agente activo", className: "bg-success/10 text-success" },
  conectada: { label: "Conectada", className: "bg-primary/10 text-primary" },
  desconectada: { label: "Desconectada", className: "bg-secondary text-muted-foreground" },
};

export function PageCard({ page, onToggleAgent }: PageCardProps) {
  const status = statusConfig[page.status];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)]">
      <Avatar label={page.initials} size={48} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={`/pages/${page.id}`}
            className="truncate text-sm font-semibold text-foreground hover:underline"
          >
            {page.name}
          </a>
          <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", status.className)}>
            {status.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {page.category} · Último mensaje {page.lastMessage}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Agente</span>
        <Toggle
          checked={page.agentEnabled}
          onChange={(v) => onToggleAgent(page.id, v)}
          label={`Activar agente para ${page.name}`}
        />
      </div>
    </div>
  );
}
