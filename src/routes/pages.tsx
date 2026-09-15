import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/pages")({
  head: () => ({
    meta: [
      { title: "Tus Páginas conectadas — Allia2" },
      { name: "description", content: "Administra tus Páginas de Facebook conectadas a Allia2." },
      { property: "og:title", content: "Tus Páginas conectadas — Allia2" },
      { property: "og:description", content: "Administra tus Páginas de Facebook conectadas a Allia2." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PagesLayout,
});

function PagesLayout() {
  return <Outlet />;
}
