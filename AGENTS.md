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
- Business rules remain pure in `src/lib/energy.ts`; console data is loaded through the authenticated workspace query and provider, using persisted sites and stored simulated readings, not fixture getters. Why: calculations can receive real telemetry later without changing account ownership or page wiring.
- Maintenance dates are persisted on sites and recorded history; scheduling remains pure in `src/lib/maintenance.ts`, while unconnected manufacturer software status stays unverified. Why: recorded service dates must not be confused with manufacturer telemetry.
- Simulation templates are private Cloud records copied once by the account-role insertion trigger; never provision or seed from a page or server function. Why: new accounts receive isolated saved demonstrations without shared mutable state.
- Site access uses owner or the owner's current linked company in database policies; crews belong to a business, dispatch and alert writes are business-only, and settings/notifications belong to their user. Why: linking grants access to the same installation and unlinking immediately revokes it.
- Insurance rules (status, days remaining, 30/14/7/1/0-day reminders, fleet KPIs) are pure in `src/lib/insurance.ts` with tests; policies and claims persist in Cloud scoped by `can_read_site`, documents live in the private `insurance-docs` bucket under `<site_id>/...`, and writes go through `src/lib/insurance.functions.ts`. Why: same rules-from-data separation, and document access follows installation access automatically.
- Workspace reads recover authentication failures with one session refresh and one retry; rejected sessions are cleared and the console returns to sign-in without weakening server token validation. Why: stale preview sessions must not strand users on a data-loading error page.
