import { useEffect, useState } from "react";
import { connectablePages, connectedPages, type MockPage } from "./mockData";

const STORAGE_KEY = "allia2.connectedPages";

function read(): MockPage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as MockPage[]) : [];
  } catch {
    return [];
  }
}

function write(pages: MockPage[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch {
    /* almacenamiento no disponible */
  }
  window.dispatchEvent(new Event("allia2:pages-changed"));
}

function buildPage(id: string): MockPage | undefined {
  const source = connectablePages.find((p) => p.id === id);
  if (!source) return undefined;
  const template = connectedPages.find((p) => p.id === id);
  if (template) return { ...template, status: "conectada", agentEnabled: false };

  return {
    id: source.id,
    name: source.name,
    initials: source.initials,
    category: source.category,
    status: "conectada",
    lastMessage: "hace un momento",
    agentEnabled: false,
    connectedAt: new Date().toISOString().slice(0, 10),
    authorizedAgo: "hace un momento",
    businessInfo: {
      name: source.name,
      hours: "Lun–Vie 9:00–18:00",
      services: "",
      greeting: `¡Hola! Bienvenido a ${source.name}. ¿Cómo puedo ayudarte?`,
    },
    appointments: [],
  };
}

export function savePage(id: string) {
  const page = buildPage(id);
  if (!page) return;
  const current = read().filter((p) => p.id !== id);
  write([...current, page]);
}

export function updatePage(id: string, patch: Partial<MockPage>) {
  write(read().map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

export function removePage(id: string) {
  write(read().filter((p) => p.id !== id));
}

/** Lee las Páginas guardadas después de la hidratación. */
export function useStoredPages() {
  const [pages, setPages] = useState<MockPage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => setPages(read());
    sync();
    setLoaded(true);
    window.addEventListener("allia2:pages-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("allia2:pages-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { pages, loaded };
}
