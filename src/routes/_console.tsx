import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/solar/AppShell";
import { NotificationsProvider } from "@/components/solar/notifications";
import { canOpen, loadAccount } from "@/lib/account";

export const Route = createFileRoute("/_console")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const account = await loadAccount();
    if (!account) throw redirect({ to: "/auth" });
    if (!account.role) throw redirect({ to: "/onboarding" });
    if (!canOpen(account.role, location.pathname)) throw redirect({ to: "/dashboard" });
    return { account };
  },
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
