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
  { id: "page_001", name: "Clínica Norte", initials: "CN", category: "Salud y medicina" },
  { id: "page_002", name: "Barbería Centro", initials: "BC", category: "Servicios de belleza" },
  { id: "page_003", name: "Taller López", initials: "TL", category: "Servicios automotrices" },
];

// Pages already connected (shown in /pages list)
export const connectedPages: MockPage[] = [
  {
    id: "page_001",
    name: "Clínica Norte",
    initials: "CN",
    category: "Salud y medicina",
    status: "agente_activo",
    lastMessage: "hace 5 min",
    agentEnabled: true,
    connectedAt: "2026-09-13",
    authorizedAgo: "hace 2 días",
    businessInfo: {
      name: "Clínica Norte",
      hours: "Lun–Vie 9:00–18:00, Sáb 9:00–13:00",
      services: "Limpieza dental, Ortodoncia, Endodoncia, Consulta general",
      greeting: "¡Hola! Bienvenido a Clínica Norte. ¿Cómo puedo ayudarte hoy?",
    },
    appointments: [
      { id: "apt_1", client: "María González", service: "Limpieza dental", datetime: "Hoy 15:00", status: "confirmada" },
      { id: "apt_2", client: "Carlos Ruiz", service: "Consulta general", datetime: "Mañana 10:30", status: "pendiente" },
      { id: "apt_3", client: "Ana Torres", service: "Ortodoncia", datetime: "Jue 17:00", status: "confirmada" },
    ],
  },
  {
    id: "page_002",
    name: "Barbería Centro",
    initials: "BC",
    category: "Servicios de belleza",
    status: "conectada",
    lastMessage: "hace 1 h",
    agentEnabled: false,
    connectedAt: "2026-09-12",
    authorizedAgo: "hace 3 días",
    businessInfo: {
      name: "Barbería Centro",
      hours: "Lun–Sáb 10:00–20:00",
      services: "Corte clásico, Afeitado, Corte + barba, Diseño de cejas",
      greeting: "¡Qué tal! Barbería Centro. ¿Agendamos tu corte?",
    },
    appointments: [
      { id: "apt_1", client: "Jorge Méndez", service: "Corte + barba", datetime: "Hoy 14:00", status: "confirmada" },
      { id: "apt_2", client: "Pedro Lara", service: "Corte clásico", datetime: "Hoy 16:00", status: "pendiente" },
    ],
  },
];

export function getPageById(id: string): MockPage | undefined {
  return connectedPages.find((p) => p.id === id);
}
