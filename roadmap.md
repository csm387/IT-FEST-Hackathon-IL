# Tasks
- [x] Store simulated installations, readings, service records, crews, jobs and alerts in Cloud with account-scoped access.
- [x] Connect all console pages to saved data and persist dispatch, O&M, notifications and settings.
- [x] Seed 42-installation simulation catalog, 60-day readings, four crews and 15 jobs/alerts; provision the existing individual account.
- [x] Verify individual pages, notifications/preferences persistence and maintenance date readback with a 24-month next due date.
- [x] Insurance module: policies + claims tables with site-scoped access, private insurance-docs bucket, /insurance page (KPIs, sortable/filterable table, policy CRUD, PDF upload/view, claims with status flow and printable summary), expiry reminders (30/14/7/1/0 days, deduped, toggleable), badge on installation pages, demo policies/claims seeded via simulation template.
- [ ] Verify dispatch persistence and client-link access using a Business account — blocked: no Business auth user exists, and a reserved-domain test signup was rejected; needs a real Business account.
- [ ] Email reminders for insurance expiry — blocked: no verified sender domain configured; in-app notifications work.