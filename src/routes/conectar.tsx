import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/conectar")({
  component: ConectarLayout,
});

function ConectarLayout() {
  return <Outlet />;
}
