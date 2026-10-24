import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_console/map")({
  beforeLoad: () => { throw redirect({ to: "/business/dispatch", statusCode: 301 }); },
});
