import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/solar/AppShell";
import { NotificationsProvider } from "@/components/solar/notifications";

export const Route = createFileRoute("/_console")({
  component: ConsoleLayout,
});

function ConsoleLayout() {
  return (
    <NotificationsProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </NotificationsProvider>
  );
}
