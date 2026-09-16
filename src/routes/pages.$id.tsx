import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Toggle } from "@/components/Toggle";
import { getPageById, type MockPage } from "@/lib/mockData";
import { removePage, updatePage, useStoredPages } from "@/lib/pageStore";

export const Route = createFileRoute("/pages/$id")({
  component: PageWorkspace,
});

type Tab = "resumen" | "ficha" | "citas" | "mensajes";

function PageWorkspace() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { pages: mockPages, loaded: mockLoaded } = useStoredPages();
  const [apiPage, setApiPage] = useState<MockPage | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("resumen");
  const [showDisconnect, setShowDisconnect] = useState(false);

  useEffect(() => {
    fetch(`/api/facebook/pages/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { page: { id: string; name: string; category?: string } }) => {
        if (data.page) {
          setApiPage({
            id: data.page.id,
            name: data.page.name,
            initials: data.page.name.slice(0, 2).toUpperCase(),
            category: data.page.category || "Página de Facebook",
            status: "conectada",
            lastMessage: "Activo",
            agentEnabled: false,
            connectedAt: new Date().toISOString().slice(0, 10),
            authorizedAgo: "reciente",
            businessInfo: {
              name: data.page.name,
              hours: "Lun–Vie 9:00–18:00",
              services: "Atención vía Messenger",
              greeting: `¡Hola! Bienvenido a ${data.page.name}. ¿Cómo podemos ayudarte hoy?`,
            },
            appointments: [],
          });
        }
        setApiLoading(false);
      })
      .catch(() => {
        setApiPage(null);
        setApiLoading(false);
      });
  }, [id]);

  const page = apiPage;

  if (apiLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Página no encontrada</h1>
        <Link to="/pages" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Volver a Páginas
        </Link>
      </div>
    );
  }

  const agentEnabled = page.agentEnabled;
  const setAgentEnabled = (enabled: boolean) => {
    if (apiPage) {
      setApiPage({ ...apiPage, agentEnabled: enabled, status: enabled ? "agente_activo" : "conectada" });
    } else {
      updatePage(page.id, {
        agentEnabled: enabled,
        status: enabled ? "agente_activo" : "conectada",
      });
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "ficha", label: "Ficha" },
    { id: "citas", label: "Citas" },
    { id: "mensajes", label: "Mensajes" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/pages" className="text-sm text-muted-foreground hover:text-foreground">
          ← Páginas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{page.name}</h1>
        <p className="text-sm text-muted-foreground">{page.category}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "resumen" && (
        <ResumenTab
          page={page}
          agentEnabled={agentEnabled}
          onToggleAgent={setAgentEnabled}
          onDisconnect={() => setShowDisconnect(true)}
        />
      )}
      {activeTab === "ficha" && <FichaTab page={page} />}
      {activeTab === "citas" && <CitasTab page={page} />}
      {activeTab === "mensajes" && <MensajesTab />}

      {showDisconnect && (
        <DisconnectModal
          pageName={page.name}
          onCancel={() => setShowDisconnect(false)}
          onConfirm={() => {
            setShowDisconnect(false);
            removePage(page.id);
            navigate({ to: "/pages" });

          }}
        />
      )}
    </div>
  );
}


function ResumenTab({
  page,
  agentEnabled,
  onToggleAgent,
  onDisconnect,
}: {
  page: MockPage;
  agentEnabled: boolean;
  onToggleAgent: (v: boolean) => void;
  onDisconnect: () => void;
}) {
  const navigate = useNavigate();
  const [webhookState, setWebhookState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [webhookMsg, setWebhookMsg] = useState<string>("");

  async function handleSubscribeWebhook() {
    setWebhookState("loading");
    setWebhookMsg("");
    try {
      const res = await fetch("/api/facebook/subscribe", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setWebhookState("ok");
        setWebhookMsg("Webhook activado. Messenger enviará eventos a tu servidor.");
      } else {
        setWebhookState("error");
        const pageResult = data.pages?.find((p: { id: string }) => p.id === page.id);
        setWebhookMsg(pageResult?.error ?? data.error ?? "Error al suscribir el webhook.");
      }
    } catch {
      setWebhookState("error");
      setWebhookMsg("No se pudo contactar con el servidor. ¿Está corriendo `npm run server`?");
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Conectada
              </span>
              <span className="text-xs text-muted-foreground">
                Última autorización {page.authorizedAgo}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Page ID: <span className="font-mono text-foreground">{page.id}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Agente</span>
            <Toggle checked={agentEnabled} onChange={onToggleAgent} label="Activar agente" />
          </div>
        </div>
      </div>

      {/* Prompt Editor */}
      <PromptEditor pageId={page.id} />

      {/* Webhook */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Webhook de Messenger</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Suscribe esta Página para recibir mensajes en tu servidor local (ngrok requerido en producción).
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={handleSubscribeWebhook}
            disabled={webhookState === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {webhookState === "loading" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Activando…
              </>
            ) : (
              "Activar webhook (prueba)"
            )}
          </button>
          {webhookState === "ok" && (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {webhookMsg}
            </span>
          )}
          {webhookState === "error" && (
            <span className="text-xs text-destructive">{webhookMsg}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Acciones</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => navigate({ to: "/conectar" })}
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Reconectar con Facebook
          </button>
          <button
            onClick={onDisconnect}
            className="flex-1 rounded-lg border border-destructive/30 bg-card px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
          >
            Desconectar
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptEditor({ pageId }: { pageId: string }) {
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/pages/${pageId}/prompt`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { instructions?: string }) => {
        setInstructions(data?.instructions || "");
        setLoading(false);
      })
      .catch(() => {
        setInstructions("");
        setLoading(false);
      });
  }, [pageId]);

  async function handleSave() {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/prompt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatusMsg({ type: "success", text: "Instrucciones guardadas correctamente." });
      } else {
        setStatusMsg({ type: "error", text: data.error || "Error al guardar las instrucciones." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "No se pudo conectar con el servidor." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Cómo debe contestar</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Allia2 ya pone reglas de seguridad. Aquí va horario, precios, tono.
          </p>
        </div>
        <span className="text-xs font-mono text-muted-foreground self-end sm:self-auto">
          {instructions.length} / 8000
        </span>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value.slice(0, 8000))}
            rows={6}
            placeholder="Escribe aquí cómo debe responder el asistente: horarios de atención, precios base, servicios ofrecidos, preguntas frecuentes y el tono del negocio..."
            className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        )}
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          {statusMsg && (
            <span
              className={`text-xs ${
                statusMsg.type === "success" ? "text-success font-medium" : "text-destructive"
              }`}
            >
              {statusMsg.text}
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function FichaTab({ page }: { page: MockPage }) {
  const [info, setInfo] = useState(page.businessInfo);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Ficha del negocio</h2>
      <div className="space-y-4">
        <Field label="Nombre del negocio">
          <input
            value={info.name}
            onChange={(e) => setInfo({ ...info, name: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </Field>
        <Field label="Horarios">
          <input
            value={info.hours}
            onChange={(e) => setInfo({ ...info, hours: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </Field>
        <Field label="Servicios">
          <textarea
            value={info.services}
            onChange={(e) => setInfo({ ...info, services: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </Field>
        <Field label="Saludo de bienvenida">
          <textarea
            value={info.greeting}
            onChange={(e) => setInfo({ ...info, greeting: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </Field>
      </div>
      <button className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
        Guardar cambios
      </button>
    </div>
  );
}

function CitasTab({ page }: { page: MockPage }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Citas</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Cliente</th>
              <th className="pb-2 pr-4 font-medium">Servicio</th>
              <th className="pb-2 pr-4 font-medium">Fecha</th>
              <th className="pb-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {page.appointments.map((apt) => (
              <tr key={apt.id} className="border-b border-border/50">
                <td className="py-3 pr-4 text-foreground">{apt.client}</td>
                <td className="py-3 pr-4 text-muted-foreground">{apt.service}</td>
                <td className="py-3 pr-4 text-muted-foreground">{apt.datetime}</td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      apt.status === "confirmada"
                        ? "bg-success/10 text-success"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {apt.status === "confirmada" ? "Confirmada" : "Pendiente"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MensajesTab() {
  return (
    <div className="rounded-xl border border-border bg-card p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <svg className="h-6 w-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 12h8M8 8h8m-8 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <p className="text-sm font-medium text-foreground">Próximamente: inbox de Messenger</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Aquí verás y responderás los mensajes de tus clientes.
      </p>
    </div>
  );
}

function DisconnectModal({
  pageName,
  onCancel,
  onConfirm,
}: {
  pageName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">Desconectar Página</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ¿Seguro que quieres desconectar <span className="font-medium text-foreground">{pageName}</span>?
          Allia2 dejará de responder mensajes de esta Página.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Desconectar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
