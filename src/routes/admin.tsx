import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administración — Allia2 Messenger" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

interface ConnectedPage {
  id: string;
  name: string;
  clientId?: string | null;
}

interface Client {
  id: string;
  name: string;
  code: string;
  maxPages: number;
  usedPages: number;
  status: "active" | "paused";
  createdAt: string;
  pages: { id: string; name: string }[];
}

function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [allPages, setAllPages] = useState<ConnectedPage[]>([]);
  const [loading, setLoading] = useState(true);

  // New Client Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientMaxPages, setNewClientMaxPages] = useState(1);
  const [creatingClient, setCreatingClient] = useState(false);
  const [createError, setCreateError] = useState("");

  // Feedback states
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Manual link page state per client: clientId -> pageId
  const [manualLinkMap, setManualLinkMap] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/admin/check");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authenticated) {
        setIsAuthenticated(true);
        loadDashboardData();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setAuthChecked(true);
    }
  }

  async function loadDashboardData() {
    setLoading(true);
    setActionError(null);
    try {
      const [clientsRes, pagesRes] = await Promise.all([
        fetch("/api/admin/clients"),
        fetch("/api/admin/pages"),
      ]);
      const clientsData = await clientsRes.json().catch(() => ({}));
      const pagesData = await pagesRes.json().catch(() => ({}));

      if (clientsRes.ok && clientsData.clients) {
        setClients(clientsData.clients);
      }
      if (pagesRes.ok && pagesData.pages) {
        setAllPages(pagesData.pages);
      }
    } catch {
      setActionError("Error de red al cargar clientes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminKeyInput.trim()) return;

    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKeyInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setIsAuthenticated(true);
        setAdminKeyInput("");
        loadDashboardData();
      } else {
        setLoginError(data.error || "Clave de administrador incorrecta");
      }
    } catch {
      setLoginError("No se pudo conectar con el servidor");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setIsAuthenticated(false);
    setClients([]);
    setAllPages([]);
  }

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setCreatingClient(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName.trim(),
          maxPages: newClientMaxPages,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setShowCreateModal(false);
        setNewClientName("");
        setNewClientMaxPages(1);
        loadDashboardData();
      } else {
        setCreateError(data.error || "Error al crear el cliente");
      }
    } catch {
      setCreateError("Error de conexión con el servidor");
    } finally {
      setCreatingClient(false);
    }
  }

  async function handleToggleStatus(client: Client) {
    const nextStatus = client.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadDashboardData();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "No se pudo actualizar el estado");
      }
    } catch {
      alert("Error de conexión al actualizar estado");
    }
  }

  async function handleRegenerateCode(client: Client) {
    if (!confirm(`¿Regenerar el enlace de ${client.name}? El enlace anterior quedará invalidado.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/regenerate-code`, {
        method: "POST",
      });
      if (res.ok) {
        loadDashboardData();
      } else {
        alert("Error al regenerar el código");
      }
    } catch {
      alert("Error de red al regenerar código");
    }
  }

  async function handleUnlinkPage(client: Client, pageId: string) {
    if (!confirm(`¿Desvincular esta Página de ${client.name}? La Página quedará libre.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/unlink-page/${pageId}`, {
        method: "POST",
      });
      if (res.ok) {
        loadDashboardData();
      } else {
        alert("Error al desvincular la Página");
      }
    } catch {
      alert("Error de red al desvincular Página");
    }
  }

  async function handleLinkPage(client: Client) {
    const pageId = manualLinkMap[client.id];
    if (!pageId) return;

    try {
      const res = await fetch(`/api/admin/clients/${client.id}/link-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setManualLinkMap((prev) => ({ ...prev, [client.id]: "" }));
        loadDashboardData();
      } else {
        alert(data.error || "No se pudo vincular la Página");
      }
    } catch {
      alert("Error de red al vincular Página");
    }
  }

  async function handleDeleteClient(client: Client) {
    if (!confirm(`¿Eliminar al cliente "${client.name}"? Las Páginas asociadas quedarán liberadas.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadDashboardData();
      } else {
        alert("Error al eliminar cliente");
      }
    } catch {
      alert("Error de red al eliminar cliente");
    }
  }

  function copyInviteLink(code: string) {
    const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://fbm.allia2.com.mx";
    const fullUrl = `${origin}/conectar?code=${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0866FF] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)]">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#0866FF] text-white font-bold text-xl shadow-md">
              A2
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">Panel de Control Bruce</h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Ingresa la clave ADMIN_KEY del servidor para gestionar clientes y enlaces.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Clave de Administrador
              </label>
              <input
                type="password"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                placeholder="••••••••••••••••"
                autoFocus
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#0866FF] focus:outline-none focus:ring-1 focus:ring-[#0866FF]"
              />
            </div>

            {loginError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn || !adminKeyInput.trim()}
              className="w-full rounded-lg bg-[#0866FF] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0866FF]/90 disabled:opacity-50"
            >
              {loggingIn ? "Verificando…" : "Entrar al Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeClientsCount = clients.filter((c) => c.status === "active").length;
  const totalConnectedPages = allPages.length;

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-16">
      {/* Top Navbar */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0866FF] text-white font-bold text-sm shadow-sm">
              A2
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-none">Allia2 Messenger</h1>
              <span className="text-[11px] text-muted-foreground">Panel de Control de Clientes</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0866FF] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0866FF]/90 shadow-sm"
            >
              <span>+</span> Nuevo Cliente
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto max-w-6xl px-4 pt-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Total Clientes</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{clients.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Clientes Activos</p>
            <p className="mt-1 text-2xl font-bold text-success">{activeClientsCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Páginas en el Servidor</p>
            <p className="mt-1 text-2xl font-bold text-[#0866FF]">{totalConnectedPages}</p>
          </div>
        </div>

        {actionError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive font-medium">
            {actionError}
          </div>
        )}

        {/* Clients Table / Cards */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Clientes y Enlaces de Acceso</h2>
              <p className="text-xs text-muted-foreground">
                Cada cliente solo puede conectar las Páginas autorizadas en su cupo.
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="text-xs text-[#0866FF] hover:underline font-medium"
            >
              {loading ? "Actualizando…" : "Refrescar"}
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#0866FF] border-t-transparent" />
              <p className="mt-2 text-xs text-muted-foreground">Cargando clientes…</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium text-foreground">No hay clientes registrados.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-3 inline-block text-xs font-semibold text-[#0866FF] hover:underline"
              >
                + Crear el primer cliente
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {clients.map((client) => {
                const isFull = client.usedPages >= client.maxPages;
                const availablePagesToLink = allPages.filter(
                  (p) => !p.clientId || p.clientId !== client.id
                );

                return (
                  <div key={client.id} className="p-5 space-y-4 hover:bg-muted/10 transition-colors">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                          {client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">{client.name}</h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                client.status === "active"
                                  ? "bg-success/10 text-success"
                                  : "bg-amber-500/10 text-amber-600"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  client.status === "active" ? "bg-success" : "bg-amber-500"
                                }`}
                              />
                              {client.status === "active" ? "Activo" : "Pausado"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Cupo: <strong className={isFull ? "text-amber-600" : "text-foreground"}>{client.usedPages}</strong> de <strong>{client.maxPages}</strong> Página(s) vinculada(s)
                          </p>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleToggleStatus(client)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                            client.status === "active"
                              ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/5"
                              : "border-success/30 text-success hover:bg-success/5"
                          }`}
                        >
                          {client.status === "active" ? "Pausar" : "Reactivar"}
                        </button>
                        <button
                          onClick={() => handleRegenerateCode(client)}
                          title="Regenerar código de invitación"
                          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                        >
                          Regenerar código
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client)}
                          title="Eliminar cliente"
                          className="rounded-lg border border-destructive/30 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {/* Invite Link Box */}
                    <div className="rounded-lg border border-border bg-secondary/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Enlace único para WhatsApp:
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                            {client.code}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate mt-1 select-all">
                          https://fbm.allia2.com.mx/conectar?code={client.code}
                        </p>
                      </div>

                      <button
                        onClick={() => copyInviteLink(client.code)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          copiedCode === client.code
                            ? "bg-success text-white"
                            : "bg-[#0866FF] text-white hover:bg-[#0866FF]/90"
                        }`}
                      >
                        {copiedCode === client.code ? "✓ ¡Enlace Copiado!" : "Copiar enlace"}
                      </button>
                    </div>

                    {/* Linked Pages Section */}
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-semibold text-foreground">
                        Páginas vinculadas a este cliente:
                      </span>
                      {client.pages.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Ninguna Página conectada todavía. Comparte el enlace para que el cliente la conecte.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {client.pages.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card shadow-xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                                <p className="text-[11px] font-mono text-muted-foreground truncate">ID: {p.id}</p>
                              </div>
                              <button
                                onClick={() => handleUnlinkPage(client, p.id)}
                                className="shrink-0 text-[11px] font-medium text-destructive hover:underline"
                              >
                                Soltar Página
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Manual Page Link Row */}
                      {!isFull && availablePagesToLink.length > 0 && (
                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          <select
                            value={manualLinkMap[client.id] || ""}
                            onChange={(e) =>
                              setManualLinkMap((prev) => ({ ...prev, [client.id]: e.target.value }))
                            }
                            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:border-[#0866FF] focus:outline-none"
                          >
                            <option value="">-- Ligar Página existente a mano --</option>
                            {availablePagesToLink.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.id})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleLinkPage(client)}
                            disabled={!manualLinkMap[client.id]}
                            className="rounded-lg bg-secondary px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
                          >
                            Ligar a este cliente
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Crear Cliente */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Crear Nuevo Cliente</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nombre del Cliente / Negocio
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej: Clínica San José, Tacos Don Beto"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#0866FF] focus:outline-none focus:ring-1 focus:ring-[#0866FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Máximo de Páginas permitidas (Cupo)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newClientMaxPages}
                  onChange={(e) => setNewClientMaxPages(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#0866FF] focus:outline-none focus:ring-1 focus:ring-[#0866FF]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Por defecto 1 Página. El cliente no podrá conectar más de esta cantidad.
                </p>
              </div>

              {createError && (
                <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
                  {createError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingClient || !newClientName.trim()}
                  className="rounded-lg bg-[#0866FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0866FF]/90 disabled:opacity-50"
                >
                  {creatingClient ? "Generando…" : "Crear y Generar Enlace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
