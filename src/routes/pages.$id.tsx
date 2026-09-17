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
              hours: "",
              services: "",
              greeting: "",
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
        setWebhookMsg("Página suscrita con éxito a Messenger.");
      } else {
        setWebhookState("error");
        const pageResult = data.pages?.find((p: { id: string }) => p.id === page.id);
        setWebhookMsg(pageResult?.error ?? data.error ?? "Error al suscribir la página.");
      }
    } catch {
      setWebhookState("error");
      setWebhookMsg("No se pudo contactar con el servidor de Allia2.");
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

      {/* Live Agent Simulator */}
      <AgentSimulator pageId={page.id} />

      {/* Webhook */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Suscripción de Messenger</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Conecta los eventos en vivo de Messenger al webhook de Allia2 (<span className="font-mono text-foreground">https://fbm.allia2.com.mx/api/facebook/webhook</span>).
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
                Suscribiendo…
              </>
            ) : (
              "Suscribir esta Página"
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
  const [raw, setRaw] = useState("");
  const [generated, setGenerated] = useState("");
  const [useCustom, setUseCustom] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingRaw, setSavingRaw] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rawMsg, setRawMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [promptMsg, setPromptMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/pages/${pageId}/prompt`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { raw?: string; generated?: string; useCustom?: boolean }) => {
        setRaw(data?.raw || "");
        setGenerated(data?.generated || "");
        setUseCustom(data?.useCustom ?? true);
        setLoading(false);
      })
      .catch(() => {
        setRaw("");
        setGenerated("");
        setUseCustom(true);
        setLoading(false);
      });
  }, [pageId]);

  async function handleSaveRaw() {
    setSavingRaw(true);
    setRawMsg(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/prompt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw, generated, useCustom }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setRawMsg({ type: "success", text: "Información guardada correctamente." });
      } else {
        setRawMsg({ type: "error", text: data.error || "Error al guardar información." });
      }
    } catch {
      setRawMsg({ type: "error", text: "No se pudo conectar con el servidor." });
    } finally {
      setSavingRaw(false);
    }
  }

  async function handleGeneratePrompt() {
    if (!raw.trim()) {
      setRawMsg({ type: "error", text: "Escribe la información de tu negocio primero." });
      return;
    }
    setGenerating(true);
    setPromptMsg(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/generate-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.generated) {
        setGenerated(data.generated);
        setUseCustom(true);
        // Persist the generated prompt directly
        await fetch(`/api/pages/${pageId}/prompt`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw, generated: data.generated, useCustom: true }),
        });
        setPromptMsg({ type: "success", text: "Prompt generado con IA y guardado." });
      } else {
        setPromptMsg({ type: "error", text: data.error || "Error al generar prompt con IA." });
      }
    } catch {
      setPromptMsg({ type: "error", text: "Error de red al contactar al servidor." });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSavePrompt() {
    setSavingPrompt(true);
    setPromptMsg(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/prompt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: raw || generated, generated, useCustom }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setPromptMsg({ type: "success", text: "Prompt activo guardado. El agente ahora responde estrictamente con este texto." });
      } else {
        setPromptMsg({ type: "error", text: data.error || "Error al guardar el prompt." });
      }
    } catch {
      setPromptMsg({ type: "error", text: "No se pudo conectar con el servidor." });
    } finally {
      setSavingPrompt(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-6">
      {/* Header & Help note */}
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold text-foreground">Configuración del Agente IA</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Allia2 ya pone reglas de seguridad. Aquí va horario, precios, tono.
        </p>
      </div>

      {loading ? (
        <div className="flex h-36 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Section 1: Información de tu negocio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  Información base del negocio
                </label>
                {!useCustom && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    ● ACTIVO EN VIVO
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {raw.length} / 20000
              </span>
            </div>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value.slice(0, 20000))}
              rows={6}
              placeholder="Describe aquí tu negocio: servicios, horarios, precios, ubicación, políticas..."
              className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
              <div>
                {rawMsg && (
                  <span
                    className={`text-xs ${
                      rawMsg.type === "success" ? "text-success font-medium" : "text-destructive"
                    }`}
                  >
                    {rawMsg.text}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveRaw}
                  disabled={savingRaw || generating}
                  className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {savingRaw ? "Guardando…" : "Guardar información"}
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  disabled={generating || !raw.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Generando con IA…
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">✨</span>
                      Generar prompt con IA
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 2: Prompt generado */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  Prompt activo del agente — puedes editarlo o borrar lo que no quieras
                </label>
                {useCustom && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    ● ACTIVO EN VIVO EN MESSENGER
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {generated.length} / 20000
              </span>
            </div>
            <textarea
              value={generated}
              onChange={(e) => setGenerated(e.target.value.slice(0, 20000))}
              rows={9}
              placeholder="El prompt estructurado por la IA aparecerá aquí tras pulsar 'Generar prompt con IA'. También puedes redactarlo, borrar o ajustar libremente..."
              className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs leading-relaxed"
            />

            {/* Switch useCustom */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground">
                  Usar este prompt personalizado
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {useCustom
                    ? "El asistente responderá usando este prompt estructurado."
                    : "El asistente responderá usando directamente el texto de 'Información de tu negocio'."}
                </p>
              </div>
              <Toggle
                checked={useCustom}
                onChange={setUseCustom}
                label="Usar este prompt personalizado"
              />
            </div>

            {/* Action Save Prompt */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
              <div>
                {promptMsg && (
                  <span
                    className={`text-xs ${
                      promptMsg.type === "success" ? "text-success font-medium" : "text-destructive"
                    }`}
                  >
                    {promptMsg.text}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSavePrompt}
                disabled={savingPrompt || generating}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {savingPrompt ? "Guardando…" : "Guardar prompt"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AgentSimulator({ pageId }: { pageId: string }) {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "agent"; text: string; time: string; model?: string }>
  >([
    {
      role: "agent",
      text: "¡Hola! Soy el agente IA de esta Página. Hazme una pregunta como si fueras un cliente para comprobar cómo responderé en Messenger.",
      time: "Ahora",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = [
    "Hola, ¿cuál es su horario de atención?",
    "¿Qué servicios o productos ofrecen y qué precios tienen?",
    "¿Dónde están ubicados?",
  ];

  async function handleSend(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { role: "user", text, time }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, text }),
      });
      const data = await res.json().catch(() => ({}));
      const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "agent", text: data.reply, time: replyTime, model: data.model },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            text: data.error || "No se pudo obtener respuesta del agente. Verifica la configuración.",
            time: replyTime,
          },
        ]);
      }
    } catch {
      const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Error de conexión al simular la respuesta.",
          time: replyTime,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>Probar agente IA (simulador en vivo)</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Gemini 2.5
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Prueba cómo responderá el agente a tus clientes según el prompt configurado, sin necesidad de abrir Facebook.
          </p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto rounded-lg bg-[#F0F2F5] p-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                m.role === "user"
                  ? "bg-[#0866FF] text-white rounded-br-none"
                  : "bg-white text-[#050505] rounded-bl-none border border-black/5"
              }`}
            >
              {m.text}
            </div>
            <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
              <span>{m.time}</span>
              {m.model && (
                <span className="font-mono text-[9px] text-primary/80">({m.model})</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 rounded-2xl bg-white border border-black/5 px-3.5 py-2 w-fit">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.4s]" />
          </div>
        )}
      </div>

      {/* Suggested chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            disabled={loading}
            onClick={() => handleSend(s)}
            className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe una pregunta de prueba..."
          disabled={loading}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}

function FichaTab({ page }: { page: MockPage }) {
  const [info, setInfo] = useState(page.businessInfo);
  const [saved, setSaved] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Ficha del negocio</h2>
      <div className="space-y-4">
        <Field label="Nombre del negocio">
          <input
            value={info.name}
            onChange={(e) => { setInfo({ ...info, name: e.target.value }); setSaved(false); }}
            placeholder="Ej: Fta Laredo"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </Field>
        <Field label="Horarios de atención">
          <input
            value={info.hours}
            onChange={(e) => { setInfo({ ...info, hours: e.target.value }); setSaved(false); }}
            placeholder="Ej: Lunes a Viernes 9:00 a 18:00, Sábados 9:00 a 14:00"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </Field>
        <Field label="Servicios principales y precios">
          <textarea
            value={info.services}
            onChange={(e) => { setInfo({ ...info, services: e.target.value }); setSaved(false); }}
            placeholder="Detalla tus servicios, productos y precios o promociones..."
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </Field>
        <Field label="Saludo cordial de bienvenida">
          <textarea
            value={info.greeting}
            onChange={(e) => { setInfo({ ...info, greeting: e.target.value }); setSaved(false); }}
            placeholder="Mensaje de bienvenida para los clientes que escriban por primera vez..."
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSaved(true)}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Guardar cambios
        </button>
        {saved && (
          <span className="text-xs text-success font-medium">✓ Cambios guardados en la ficha</span>
        )}
      </div>
    </div>
  );
}

function CitasTab({ page }: { page: MockPage }) {
  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground">Agenda de Citas</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Las citas las anota el agente y las ves aquí cuando haya. Hoy aún no hay.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-success" />
        Agente configurado para captar y registrar citas
      </div>
    </div>
  );
}

function MensajesTab() {
  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M8 8h8m-8 8h5" />
          <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.5" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground">Atención 24/7 en Messenger</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Tu agente IA responde de manera autónoma e inmediata a las conversaciones entrantes en Messenger.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        También puedes consultar el historial y responder directamente en cualquier momento desde Meta Business Suite.
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
