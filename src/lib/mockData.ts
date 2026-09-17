export interface MockPage {
  id: string;
  name: string;
  initials: string;
  category: string;
  status: "conectada" | "agente_activo" | "desconectada";
  lastMessage: string;
  agentEnabled: boolean;
  connectedAt: string;
  authorizedAgo: string;
  businessInfo: {
    name: string;
    hours: string;
    services: string;
    greeting: string;
  };
  appointments: MockAppointment[];
}

export interface MockAppointment {
  id: string;
  client: string;
  service: string;
  datetime: string;
  status: "pendiente" | "confirmada";
}

// Pages shown in the connect flow (Step 2 — choose page)
export const connectablePages = [
  { id: "page_001", name: "Mi Negocio", initials: "MN", category: "Servicios locales" },
];

// Pages already connected (shown in /pages list)
export const connectedPages: MockPage[] = [
  {
    id: "page_001",
    name: "Mi Negocio",
    initials: "MN",
    category: "Servicios locales",
    status: "conectada",
    lastMessage: "Activo",
    agentEnabled: false,
    connectedAt: "2026-09-15",
    authorizedAgo: "reciente",
    businessInfo: {
      name: "Mi Negocio",
      hours: "",
      services: "",
      greeting: "",
    },
    appointments: [],
  },
];

export function getPageById(id: string): MockPage | undefined {
  return connectedPages.find((p) => p.id === id);
}
