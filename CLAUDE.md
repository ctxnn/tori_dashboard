# Torii — notes for working in this repo

- Next.js 16 App Router + TypeScript; SQLite via built-in `node:sqlite` (Node 22.13+). No ORM: raw SQL in `src/lib/domain/*`.
- All business rules live in `src/lib/domain`; pages read through it, mutations go through `src/app/api/*` route handlers that call `requireApiUser(...)`.
- Money is integer paise; percentages are basis points. Never use floats for money.
- Campaign versions are immutable once submitted; approvals bind to `content_hash`. Don't add code paths that mutate a non-draft version.
- Payments only change through `receiveProviderEvent` (idempotent). Ledger writes use `INSERT OR IGNORE` with an idempotency key.
- `npm test` runs the workflow suite against a temp data dir. The dev server may miss new route folders until restarted.
