<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- App pages live under the `_console` pathless layout (client-only auth gate in its beforeLoad, loads the account into route context; sidebar shell shows the Individual or Business menu from `SPACES`). Account type is stored in `user_roles` (set once at signup/onboarding), access rules in `src/lib/account.ts`; business-only pages live under `/business`, `/sites`, `/operations`. Individuals link to a company via its invite code (`link_company` RPC). Why: one shell, two audiences, permissions enforced in the database.
- Dispatch rules (job status flow, crew assignment, nearest crew) are pure functions in `src/lib/dispatch.ts` with tests in `src/test/dispatch.test.ts`. Why: same separation of rules from simulated data.
- Business rules (energy balance, battery, compensation, finance, anomalies) are pure functions in `src/lib/energy.ts` with tests in `src/test/energy.test.ts`; simulated fleet data lives in `src/lib/fleet.ts`. Why: swap simulation for real data later without touching rules.
- Maintenance scheduling and explicitly simulated service records live in `src/lib/maintenance.ts`, with separate rule tests; unconnected manufacturer software status remains unverified rather than inferred. Why: service dates and firmware availability must not be presented as real telemetry.
