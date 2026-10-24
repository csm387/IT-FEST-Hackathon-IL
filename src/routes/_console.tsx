import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/solar/AppShell";
import { NotificationsProvider } from "@/components/solar/notifications";
import { canOpen, loadAccount } from "@/lib/account";
import { WorkspaceProvider, workspaceQuery } from '@/components/solar/WorkspaceProvider';

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
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery(context.account.userId)),
});

function ConsoleLayout() {
  const { account } = Route.useRouteContext();
  return (
    <WorkspaceProvider account={account}><NotificationsProvider userId={account.userId}>
      <AppShell>
        <Outlet />
      </AppShell>
    </NotificationsProvider></WorkspaceProvider>
  );
}
