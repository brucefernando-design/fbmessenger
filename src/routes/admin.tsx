import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel de Control — Allia2 Messenger" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

export type TesterStatus =
  | "faltan_datos"
  | "listo_para_invitar"
  | "invitacion_enviada"
  | "tester_aceptado"
  | "no_aparece"
  | "conecto_pagina";

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
  whatsapp?: string;
  facebookUsername?: string;
  facebookName?: string;
  testerStatus: TesterStatus;
  invitedAt?: string | null;
  acceptedAt?: string | null;
  requireTesterAccepted?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  pages: { id: string; name: string }[];
}

interface TesterRow {
  clientId: string;
  clientName: string;
  whatsapp: string;
  facebookUsername: string;
  facebookName: string;
  testerStatus: TesterStatus;
  invitedAt: string | null;
  acceptedAt: string | null;
  requireTesterAccepted: boolean;
  code: string;
  link: string;
  status: "active" | "paused";
  notes: string;
  usedPages: number;
  maxPages: number;
  pages: { id: string; name: string }[];
  createdAt: string;
  updatedAt?: string;
}

export function getStatusBadge(status: TesterStatus) {
  switch (status) {
    case "faltan_datos":
      return {
        label: "Faltan datos",
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        dot: "bg-slate-400",
      };
    case "listo_para_invitar":
      return {
        label: "Listo para invitar",
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
      };
    case "invitacion_enviada":
      return {
        label: "Invitación enviada",
        bg: "bg-sky-50 text-sky-700 border-sky-200",
        dot: "bg-sky-500",
      };
    case "tester_aceptado":
      return {
        label: "Tester aceptado",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "no_aparece":
      return {
        label: "No aparece en Meta",
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
      };
    case "conecto_pagina":
      return {
        label: "Página conectada",
        bg: "bg-green-50 text-green-800 border-green-200",
        dot: "bg-green-600",
      };
    default:
      return {
        label: status,
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        dot: "bg-slate-400",
      };
  }
}

function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Active view: "embudo" or "testers"
  const [activeTab, setActiveTab] = useState<"embudo" | "testers">("embudo");

  const [clients, setClients] = useState<Client[]>([]);
  const [testers, setTesters] = useState<TesterRow[]>([]);
  const [allPages, setAllPages] = useState<ConnectedPage[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Client / Tester Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientFbUser, setNewClientFbUser] = useState("");
  const [newClientWhatsapp, setNewClientWhatsapp] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");
  const [newClientMaxPages, setNewClientMaxPages] = useState(1);
  const [creatingClient, setCreatingClient] = useState(false);
  const [createError, setCreateError] = useState("");

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Per-client validation states & edit forms
  const [validatingMap, setValidatingMap] = useState<Record<string, boolean>>({});
  const [validationResultMap, setValidationResultMap] = useState<Record<string, string>>({});
  const [clientEditMap, setClientEditMap] = useState<
    Record<
      string,
      {
        facebookUsername: string;
        whatsapp: string;
        facebookName: string;
        notes: string;
      }
    >
  >({});
  const [savingClientMap, setSavingClientMap] = useState<Record<string, boolean>>({});
  const [manualLinkMap, setManualLinkMap] = useState<Record<string, string>>({});

  // Testers view search & filter
  const [testerSearch, setTesterSearch] = useState("");
  const [testerFilterStatus, setTesterFilterStatus] = useState<string>("all");

  useEffect(() => {
    checkAuth();
  }, []);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

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
      const [clientsRes, pagesRes, testersRes] = await Promise.all([
        fetch("/api/admin/clients"),
        fetch("/api/admin/pages"),
        fetch("/api/admin/testers"),
      ]);
      const clientsData = await clientsRes.json().catch(() => ({}));
      const pagesData = await pagesRes.json().catch(() => ({}));
      const testersData = await testersRes.json().catch(() => ({}));

      if (clientsRes.ok && clientsData.clients) {
        setClients(clientsData.clients);
        // Initialize inline edit state for each client
        const editMap: Record<
          string,
          { facebookUsername: string; whatsapp: string; facebookName: string; notes: string }
        > = {};
        for (const c of clientsData.clients) {
          editMap[c.id] = {
            facebookUsername: c.facebookUsername || "",
            whatsapp: c.whatsapp || "",
            facebookName: c.facebookName || "",
            notes: c.notes || "",
          };
        }
        setClientEditMap(editMap);
      }
      if (pagesRes.ok && pagesData.pages) {
        setAllPages(pagesData.pages);
      }
      if (testersRes.ok && testersData.testers) {
        setTesters(testersData.testers);
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
        setLoginError(data.error || "Clave de Allia2 incorrecta");
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
    setTesters([]);
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
          facebookUsername: newClientFbUser.trim(),
          whatsapp: newClientWhatsapp.trim(),
          notes: newClientNotes.trim(),
          maxPages: newClientMaxPages,
          requireTesterAccepted: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setShowCreateModal(false);
        setNewClientName("");
        setNewClientFbUser("");
        setNewClientWhatsapp("");
        setNewClientNotes("");
        setNewClientMaxPages(1);
        showToast("Cliente y tester creados exitosamente");
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

  async function handleSaveClientData(clientId: string) {
    const edit = clientEditMap[clientId];
    if (!edit) return;

    setSavingClientMap((prev) => ({ ...prev, [clientId]: true }));
    try {
      const fbUser = edit.facebookUsername.trim();
      const payload: Record<string, unknown> = {
        facebookUsername: fbUser,
        whatsapp: edit.whatsapp.trim(),
        facebookName: edit.facebookName.trim(),
        notes: edit.notes.trim(),
      };
      const currentClient = clients.find((c) => c.id === clientId);
      if (currentClient?.testerStatus === "faltan_datos" && fbUser) {
        payload.testerStatus = "listo_para_invitar";
      }

      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("Datos de Facebook y WhatsApp guardados");
        loadDashboardData();
      } else {
        alert("No se pudieron guardar los datos");
      }
    } catch {
      alert("Error de red al guardar datos");
    } finally {
      setSavingClientMap((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  async function handleUpdateTesterStatus(clientId: string, status: TesterStatus) {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testerStatus: status }),
      });
      if (res.ok) {
        showToast(`Estado actualizado: ${getStatusBadge(status).label}`);
        loadDashboardData();
      } else {
        alert("No se pudo actualizar el estado de tester");
      }
    } catch {
      alert("Error de red al actualizar estado");
    }
  }

  async function handleToggleRequireTester(client: Client) {
    const nextVal = client.requireTesterAccepted === false ? true : false;
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireTesterAccepted: nextVal }),
      });
      if (res.ok) {
        showToast(
          nextVal
            ? "Bloqueo activado: Requiere tester aceptado para conectar"
            : "Bloqueo desactivado: Enlace abierto sin requerir tester"
        );
        loadDashboardData();
      }
    } catch {
      alert("Error de red al cambiar regla");
    }
  }

  async function handleValidateTester(clientId: string) {
    setValidatingMap((prev) => ({ ...prev, [clientId]: true }));
    setValidationResultMap((prev) => ({ ...prev, [clientId]: "" }));
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/validate-tester`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setValidationResultMap((prev) => ({
          ...prev,
          [clientId]: data.detail || `Estado verificado: ${data.status}`,
        }));
        loadDashboardData();
      } else {
        setValidationResultMap((prev) => ({
          ...prev,
          [clientId]: data.error || "No se pudo consultar Meta",
        }));
      }
    } catch {
      setValidationResultMap((prev) => ({
        ...prev,
        [clientId]: "Error de conexión al consultar Meta Graph API",
      }));
    } finally {
      setValidatingMap((prev) => ({ ...prev, [clientId]: false }));
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
        showToast(nextStatus === "active" ? "Cliente activado" : "Cliente pausado");
        loadDashboardData();
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
        showToast("Código regenerado con éxito");
        loadDashboardData();
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
        showToast("Página desvinculada");
        loadDashboardData();
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
        showToast("Página vinculada con éxito");
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
        showToast("Cliente eliminado");
        loadDashboardData();
      }
    } catch {
      alert("Error de red al eliminar cliente");
    }
  }

  // Copy helper texts
  function copyMessage1PedirUsuario() {
    const msg =
      "Para activar Allia2 necesito el usuario o el nombre de tu Facebook (no la contraseña). Con eso te mando la invitación de tester y luego tu enlace para conectar la Página.";
    navigator.clipboard.writeText(msg);
    showToast("Mensaje 1 (Pedir usuario) copiado al portapapeles");
  }

  function copyMessage2RecordatorioTester() {
    const msg =
      "Ya te mandé la invitación de tester en Facebook. Ábrela en notificaciones o en developers.facebook.com/requests y acéptala. Cuando esté aceptada te mando el enlace para conectar tu Página.";
    navigator.clipboard.writeText(msg);
    showToast("Mensaje 2 (Recordatorio tester) copiado al portapapeles");
  }

  function copyMessage3EnlaceListo(client: Client) {
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://fbm.allia2.com.mx";
    const fullUrl = `${origin}/conectar?code=${client.code}`;
    const msg = `¡Listo! Ya tienes habilitado tu acceso a Allia2. Abre este enlace para conectar tu Página de Facebook: ${fullUrl}`;
    navigator.clipboard.writeText(msg);
    showToast("Mensaje con enlace de conexión copiado");
  }

  function copyDirectLink(code: string) {
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://fbm.allia2.com.mx";
    const fullUrl = `${origin}/conectar?code=${code}`;
    navigator.clipboard.writeText(fullUrl);
    showToast("Enlace copiado al portapapeles");
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
              Ingresa la Clave de Allia2 para gestionar clientes, testers y enlaces.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Clave de Allia2
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

  // Filter testers
  const filteredTesters = testers.filter((t) => {
    const matchesSearch =
      t.clientName.toLowerCase().includes(testerSearch.toLowerCase()) ||
      t.facebookUsername.toLowerCase().includes(testerSearch.toLowerCase()) ||
      t.whatsapp.includes(testerSearch);
    if (!matchesSearch) return false;
    if (testerFilterStatus === "all") return true;
    return t.testerStatus === testerFilterStatus;
  });

  const activeClientsCount = clients.filter((c) => c.status === "active").length;
  const acceptedTestersCount = clients.filter(
    (c) => c.testerStatus === "tester_aceptado" || c.testerStatus === "conecto_pagina"
  ).length;

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0866FF] text-white font-bold text-sm shadow-sm">
              A2
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-none">Allia2 Messenger</h1>
              <span className="text-[11px] text-muted-foreground">Panel Bruce • Modo Desarrollo</span>
            </div>
          </div>

          {/* Quick Navigation Tabs */}
          <div className="flex items-center gap-2 bg-[#F0F2F5] p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveTab("embudo")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "embudo"
                  ? "bg-card text-[#0866FF] shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Clientes y Embudo (5 Pasos)
            </button>
            <button
              onClick={() => setActiveTab("testers")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "testers"
                  ? "bg-card text-[#0866FF] shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos los Testers ({testers.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
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
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
            <p className="text-[11px] text-muted-foreground font-medium">Total Clientes</p>
            <p className="mt-0.5 text-xl font-bold text-foreground">{clients.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
            <p className="text-[11px] text-muted-foreground font-medium">Clientes Activos</p>
            <p className="mt-0.5 text-xl font-bold text-emerald-600">{activeClientsCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
            <p className="text-[11px] text-muted-foreground font-medium">Testers Aceptados / Conectados</p>
            <p className="mt-0.5 text-xl font-bold text-[#0866FF]">{acceptedTestersCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
            <p className="text-[11px] text-muted-foreground font-medium">Páginas en Servidor</p>
            <p className="mt-0.5 text-xl font-bold text-foreground">{allPages.length}</p>
          </div>
        </div>

        {actionError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive font-medium">
            {actionError}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            VIEW 1: CLIENTES Y EMBUDO (5 PASOS)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "embudo" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm font-bold text-foreground">Embudo de Venta e Instalación (5 Pasos)</h2>
                <p className="text-xs text-muted-foreground">
                  Sigue el orden obligatorio por cliente: Pedir usuario ➔ Invitar en Meta ➔ Validar ➔ Mandar enlace ➔ Página conectada.
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
              <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#0866FF] border-t-transparent" />
                <p className="mt-2 text-xs text-muted-foreground">Cargando clientes…</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
                <p className="text-sm font-medium text-foreground">No hay clientes registrados.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 inline-block text-xs font-semibold text-[#0866FF] hover:underline"
                >
                  + Crear el primer cliente
                </button>
              </div>
            ) : (
              clients.map((client) => {
                const edit = clientEditMap[client.id] || {
                  facebookUsername: client.facebookUsername || "",
                  whatsapp: client.whatsapp || "",
                  facebookName: client.facebookName || "",
                  notes: client.notes || "",
                };
                const badge = getStatusBadge(client.testerStatus);
                const isTesterOk =
                  client.testerStatus === "tester_aceptado" || client.testerStatus === "conecto_pagina";
                const isBlocked = client.requireTesterAccepted !== false && !isTesterOk;

                return (
                  <div
                    key={client.id}
                    className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
                  >
                    {/* Top Bar of Client Card */}
                    <div className="border-b border-border bg-secondary/20 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0866FF]/10 text-[#0866FF] font-bold text-sm">
                          {client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">{client.name}</h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.bg}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                client.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-700"
                                  : "bg-amber-500/10 text-amber-700"
                              }`}
                            >
                              {client.status === "active" ? "Activo" : "Pausado"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Cupo: {client.usedPages}/{client.maxPages} Página(s) • Código:{" "}
                            <span className="font-mono font-medium text-foreground">{client.code}</span>
                          </p>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(client)}
                          className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                        >
                          {client.status === "active" ? "Pausar cliente" : "Reactivar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenerateCode(client)}
                          className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Regenerar código
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClient(client)}
                          className="rounded-lg border border-destructive/20 bg-card px-2.5 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/5 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {/* 5-Step Funnel Body */}
                    <div className="p-5 space-y-4">
                      {/* ──── PASO 1: PEDIR USUARIO FACEBOOK ──── */}
                      <div className="rounded-lg border border-border bg-background p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0866FF] text-white text-[10px] font-bold">
                              1
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              Paso 1: Pedir usuario de Facebook (sin clave)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={copyMessage1PedirUsuario}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0866FF] hover:underline"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copiar mensaje de WhatsApp
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                              Usuario Facebook (lo que mandó)
                            </label>
                            <input
                              type="text"
                              value={edit.facebookUsername}
                              onChange={(e) =>
                                setClientEditMap((prev) => ({
                                  ...prev,
                                  [client.id]: { ...edit, facebookUsername: e.target.value },
                                }))
                              }
                              placeholder="Ej: pedro.perez o su nombre"
                              className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-[#0866FF] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                              WhatsApp (para contacto directo)
                            </label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={edit.whatsapp}
                                onChange={(e) =>
                                  setClientEditMap((prev) => ({
                                    ...prev,
                                    [client.id]: { ...edit, whatsapp: e.target.value },
                                  }))
                                }
                                placeholder="Ej: 528671234567"
                                className="flex-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-[#0866FF] focus:outline-none"
                              />
                              {edit.whatsapp && (
                                <a
                                  href={`https://wa.me/${edit.whatsapp.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-emerald-600 hover:bg-accent flex items-center"
                                  title="Abrir WhatsApp"
                                >
                                  💬
                                </a>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                              Nombre en Facebook (opcional)
                            </label>
                            <input
                              type="text"
                              value={edit.facebookName}
                              onChange={(e) =>
                                setClientEditMap((prev) => ({
                                  ...prev,
                                  [client.id]: { ...edit, facebookName: e.target.value },
                                }))
                              }
                              placeholder="Ej: Pedro Pérez"
                              className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-[#0866FF] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSaveClientData(client.id)}
                            disabled={savingClientMap[client.id]}
                            className="rounded-md bg-secondary px-3 py-1 text-xs font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                          >
                            {savingClientMap[client.id] ? "Guardando…" : "Guardar datos"}
                          </button>
                        </div>
                      </div>

                      {/* ──── PASO 2: INVITAR TESTER EN META ──── */}
                      <div className="rounded-lg border border-border bg-background p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0866FF] text-white text-[10px] font-bold">
                              2
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              Paso 2: Invitar tester en Meta
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {client.invitedAt ? `Invitado: ${new Date(client.invitedAt).toLocaleDateString()}` : "Aún no invitado"}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          Abre los Roles de tu app en Meta for Developers, agrega el usuario como Evaluador (Tester) y luego marca la invitación como enviada.
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <a
                            href="https://developers.facebook.com/apps/1399941302106741/roles/"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#0866FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0866FF]/90 transition-colors shadow-sm"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                            </svg>
                            Abrir Roles de la app en Meta ↗
                          </a>

                          <button
                            type="button"
                            onClick={() => handleUpdateTesterStatus(client.id, "invitacion_enviada")}
                            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                          >
                            ✓ Marcar invitación enviada
                          </button>

                          <button
                            type="button"
                            onClick={copyMessage2RecordatorioTester}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            Copiar recordatorio WhatsApp
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateTesterStatus(client.id, "no_aparece")}
                            className="rounded-md border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
                          >
                            No aparece en Meta
                          </button>
                        </div>
                      </div>

                      {/* ──── PASO 3: VALIDAR / MARCAR ACEPTADO ──── */}
                      <div className="rounded-lg border border-border bg-background p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0866FF] text-white text-[10px] font-bold">
                              3
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              Paso 3: Validar / Marcar tester aceptado
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={client.requireTesterAccepted !== false}
                                onChange={() => handleToggleRequireTester(client)}
                                className="rounded border-border text-[#0866FF] focus:ring-0"
                              />
                              Requerir tester aceptado
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleValidateTester(client.id)}
                            disabled={validatingMap[client.id]}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                          >
                            {validatingMap[client.id] ? (
                              <>
                                <span className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                                Consultando Meta…
                              </>
                            ) : (
                              "Validar en Meta (Graph)"
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateTesterStatus(client.id, "tester_aceptado")}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            ✓ Marcar tester aceptado
                          </button>
                        </div>

                        {validationResultMap[client.id] && (
                          <div className="rounded-md bg-secondary/60 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground">Respuesta de Meta:</span>{" "}
                            {validationResultMap[client.id]}
                          </div>
                        )}
                      </div>

                      {/* ──── PASO 4: COPIAR ENLACE DE CONECTAR 1 PÁGINA ──── */}
                      <div className="rounded-lg border border-border bg-background p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0866FF] text-white text-[10px] font-bold">
                              4
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              Paso 4: Copiar enlace de conectar 1 Página
                            </span>
                          </div>
                          {isBlocked ? (
                            <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              Bloqueado hasta que acepte
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Enlace Habilitado
                            </span>
                          )}
                        </div>

                        {isBlocked ? (
                          <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-800 leading-relaxed">
                            ⚠️ El enlace mostrará una pantalla de espera al cliente si lo abre ahora. Acepta la invitación de tester en Facebook para desbloquearlo automáticamente (o desmarca la casilla &quot;Requerir tester aceptado&quot; arriba para saltar el bloqueo).
                          </div>
                        ) : null}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                          <input
                            type="text"
                            readOnly
                            value={`https://fbm.allia2.com.mx/conectar?code=${client.code}`}
                            className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => copyDirectLink(client.code)}
                            className="rounded-md bg-[#0866FF] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0866FF]/90 transition-colors shadow-sm whitespace-nowrap"
                          >
                            Copiar enlace
                          </button>
                          <button
                            type="button"
                            onClick={() => copyMessage3EnlaceListo(client)}
                            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors whitespace-nowrap"
                          >
                            Copiar mensaje listo WhatsApp
                          </button>
                        </div>
                      </div>

                      {/* ──── PASO 5: PÁGINA CONECTADA ──── */}
                      <div className="rounded-lg border border-border bg-background p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0866FF] text-white text-[10px] font-bold">
                              5
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              Paso 5: Página conectada
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {client.pages.length > 0 ? "1 Página vinculada" : "Sin Página aún"}
                          </span>
                        </div>

                        {client.pages.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            {client.pages.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between rounded-md border border-border bg-card p-2.5"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  <div>
                                    <p className="text-xs font-bold text-foreground">{p.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">ID: {p.id}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    to="/pages/$id"
                                    params={{ id: p.id }}
                                    className="rounded-md bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-accent transition-colors"
                                  >
                                    Ver en Allia2 ➔
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleUnlinkPage(client, p.id)}
                                    className="text-[11px] text-destructive hover:underline"
                                  >
                                    Desvincular
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            <p className="text-[11px] text-muted-foreground">
                              El cliente conectará su Página al pulsar el botón en su enlace. También puedes vincular manualmente una Página libre del servidor:
                            </p>
                            <div className="flex gap-2">
                              <select
                                value={manualLinkMap[client.id] || ""}
                                onChange={(e) =>
                                  setManualLinkMap((prev) => ({
                                    ...prev,
                                    [client.id]: e.target.value,
                                  }))
                                }
                                className="flex-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                              >
                                <option value="">-- Seleccionar Página del servidor --</option>
                                {allPages
                                  .filter((p) => !p.clientId || p.clientId !== client.id)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} (ID: {p.id})
                                    </option>
                                  ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleLinkPage(client)}
                                disabled={!manualLinkMap[client.id]}
                                className="rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
                              >
                                Vincular Página
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            VIEW 2: TODOS LOS TESTERS (LISTA PLANA & ALTA RÁPIDA)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "testers" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Todos los Testers de Meta</h2>
                <p className="text-xs text-muted-foreground">
                  Control centralizado de usuarios de Facebook, invitaciones y estado de prueba.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-lg bg-[#0866FF] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0866FF]/90 transition-colors shadow-sm"
                >
                  + Alta Rápida de Tester
                </button>
                <a
                  href="https://developers.facebook.com/apps/1399941302106741/roles/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Abrir Roles en Meta ↗
                </a>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={testerSearch}
                  onChange={(e) => setTesterSearch(e.target.value)}
                  placeholder="Buscar por negocio, usuario de Facebook o WhatsApp…"
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#0866FF] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                {[
                  { id: "all", label: "Todos" },
                  { id: "faltan_datos", label: "Faltan datos" },
                  { id: "listo_para_invitar", label: "Listos" },
                  { id: "invitacion_enviada", label: "Enviados" },
                  { id: "tester_aceptado", label: "Aceptados" },
                  { id: "conecto_pagina", label: "Conectados" },
                  { id: "no_aparece", label: "No aparecen" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTesterFilterStatus(f.id)}
                    className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
                      testerFilterStatus === f.id
                        ? "bg-[#0866FF] text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Flat Table */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-secondary/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Cliente / Negocio</th>
                      <th className="px-4 py-3">Usuario Facebook</th>
                      <th className="px-4 py-3">WhatsApp</th>
                      <th className="px-4 py-3">Estado Tester</th>
                      <th className="px-4 py-3">Fechas</th>
                      <th className="px-4 py-3 text-right">Acciones Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTesters.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No se encontraron testers con este filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredTesters.map((t) => {
                        const badge = getStatusBadge(t.testerStatus);
                        return (
                          <tr key={t.clientId} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-foreground">{t.clientName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">Cupo: {t.usedPages}/{t.maxPages}</p>
                            </td>
                            <td className="px-4 py-3">
                              {t.facebookUsername ? (
                                <span className="font-mono text-foreground font-medium">{t.facebookUsername}</span>
                              ) : (
                                <span className="text-muted-foreground italic">Sin registrar</span>
                              )}
                              {t.facebookName && (
                                <p className="text-[10px] text-muted-foreground">{t.facebookName}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {t.whatsapp ? (
                                <a
                                  href={`https://wa.me/${t.whatsapp.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 hover:underline font-medium inline-flex items-center gap-1"
                                >
                                  <span>💬</span> {t.whatsapp}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.bg}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-muted-foreground">
                              <div>
                                Inv: {t.invitedAt ? new Date(t.invitedAt).toLocaleDateString() : "—"}
                              </div>
                              <div>
                                Acept: {t.acceptedAt ? new Date(t.acceptedAt).toLocaleDateString() : "—"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleUpdateTesterStatus(t.clientId, "invitacion_enviada")}
                                className="rounded border border-border px-2 py-1 text-[10px] font-medium text-foreground hover:bg-accent"
                                title="Marcar invitación enviada"
                              >
                                Enviada
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateTesterStatus(t.clientId, "tester_aceptado")}
                                className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
                                title="Marcar tester aceptado"
                              >
                                Aceptado
                              </button>
                              <button
                                type="button"
                                onClick={() => copyDirectLink(t.code)}
                                className="rounded bg-[#0866FF] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#0866FF]/90"
                                title="Copiar enlace de conexión"
                              >
                                Copiar Link
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ALTA RÁPIDA DE CLIENTE / TESTER
      ───────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Alta Rápida de Cliente y Tester</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nombre del Negocio / Cliente *
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej: Fta Laredo, Barbería Centro"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-[#0866FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Usuario o Nombre de Facebook
                </label>
                <input
                  type="text"
                  value={newClientFbUser}
                  onChange={(e) => setNewClientFbUser(e.target.value)}
                  placeholder="Ej: pedro.perez (sin contraseña)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-[#0866FF] focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Con este usuario lo invitarás en Roles de Meta for Developers.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  WhatsApp del Cliente
                </label>
                <input
                  type="text"
                  value={newClientWhatsapp}
                  onChange={(e) => setNewClientWhatsapp(e.target.value)}
                  placeholder="Ej: 528671234567"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-[#0866FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Cupo de Páginas (Máximo)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newClientMaxPages}
                  onChange={(e) => setNewClientMaxPages(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-[#0866FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notas internas (opcional)
                </label>
                <textarea
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  placeholder="Detalles del cliente, paquetes acordados..."
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-[#0866FF] focus:outline-none"
                />
              </div>

              {createError && (
                <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
                  {createError}
                </div>
              )}

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingClient || !newClientName.trim()}
                  className="flex-1 rounded-lg bg-[#0866FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0866FF]/90 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {creatingClient ? "Creando…" : "Crear y Generar Código"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
