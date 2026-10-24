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

- App pages live under the `_console` pathless layout (sidebar shell + notifications provider); the landing page `/` stays outside it. Why: one shared shell for all dashboard pages.
- Business rules (energy balance, battery, compensation, finance, anomalies) are pure functions in `src/lib/energy.ts` with tests in `src/test/energy.test.ts`; simulated fleet data lives in `src/lib/fleet.ts`. Why: swap simulation for real data later without touching rules.
