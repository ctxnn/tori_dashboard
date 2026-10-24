# Torii 鳥居

**The gate between a licensed kit and a paid preorder.** Torii is a shared workspace where Japanese IP owners and Indian creators prepare, approve, launch and track official merchandise collaborations — built for the Thapar Japan Hackathon’s JETRO challenge.

> Demonstration build. *Sky Courier*, Kumo Lantern Studio, the creators, the seller (Indigo Thread Co.) and every commercial term are fictional. All payments run through a clearly labelled test simulator.

The hypothesis under test: *reusable assets, approvals and reporting make smaller creator collaborations easier to operate.* The prototype demonstrates the workflow end to end; it does not prove the advantage.

---

## Run it

Requires **Node 22.13+** (uses the built-in `node:sqlite`; no native modules, no external services).

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. The database is created and seeded on first start (`./data/torii.db`, artwork in `./data/uploads`).

Other commands:

```bash
npm test
```

```bash
npm run build && npm start
```

Copy `.env.example` to `.env.local` to set secrets or enable the Claude assistant. Nothing is required for a local demo.

**Reset:** the *Reset demo* link (top bar, or the bottom of the home page) restores the seeded data. It only touches the local `data/` directory. Deleting `data/` and restarting does the same.

## Proof dashboard

`/proof` turns the hypothesis into six measurable claims. Each claim has a pilot target and a live value computed from the app's own records: reviews, the audit trail, orders and the ledger. The page covers:

- **Owners decide quickly:** time from submission to decision, and the queue waiting now.
- **Few rounds of back-and-forth:** review rounds before approval.
- **Rules filter before people do:** submissions refused by the rule checks, and a count of proposals that reached a reviewer while breaking a rule (should be 0).
- **One kit, many collaborations:** kit and artwork reuse.
- **Demand is tested before anything is made:** each campaign's paid units over time against its gate, the gate hit rate, and the path from checkout to delivery.
- **The money can be trusted:** earnings per collaboration, reconciliation, and integrity counters (double charges, double refunds, sales of unapproved versions).

The targets live in `src/lib/domain/proof.ts` (`TARGETS`). They are the pilot hypothesis, not industry benchmarks. With seeded data the page shows what Torii can measure; in a pilot the same page records real evidence.

## How it works videos

`/how-it-works` plays a captioned screen recording for each login, with clickable chapters and keyboard shortcuts for presenting. Keys: 1–4 switch films, ← → move between chapters, F goes full screen. There's also one continuous film for slides (`public/demo-videos/torii-full-walkthrough.mp4`, about 6 minutes, H.264 1440×810, no audio).

The films are real recordings of this app, driven by Playwright with the seeded data (`scripts/record/`). To re-record after changing the UI:

```bash
npm run build
```

```bash
TORII_DATA_DIR=/tmp/torii-rec INSECURE_COOKIES=1 npx next start -p 3100
```

Then, in a second terminal (requires `ffmpeg`):

```bash
npm run record:demos
```

The recorder resets that throwaway server's demo, records owner → creator → fan → operator in story order, and writes the MP4s, posters and chapter timings (`src/lib/demo-videos.json`).

## Deploying for a demo

**Cloudflare Tunnel (free, used for the demo).** Serves Torii from your laptop on a public HTTPS link. Requires `brew install cloudflared`.

```bash
npm run demo:tunnel
```

This builds the app, starts it on port 3100 with fresh secrets, resets the demo data, and prints a `https://….trycloudflare.com` link. The link works while the command runs and the laptop is awake. Each run gets a new link; a permanent link needs a named tunnel on a domain in your Cloudflare account. Use `SKIP_BUILD=1` to skip the build and `RESET=0` to keep the current data. Anyone with the link can use *Reset demo*; set `DEMO_RESET=off` to disable it.

**Why not Cloudflare Workers' free plan.** The free plan stops each request after 10 ms of CPU. Measured on a warm production server, the landing page takes about 10 ms and the statement page about 13 ms. Seeding the demo data (on first start and on *Reset demo*) takes about 150 ms. Requests would fail intermittently with error 1102. Running on Workers also needs the database moved off `node:sqlite`. On a paid Workers plan (30 s of CPU), one route is to run the app inside a SQLite-backed Durable Object, so the synchronous data layer stays as it is.

**Always-on hosting.** Any host that runs a long-lived Node 22.13+ process with a persistent disk works, for example Railway or Render's Starter plan:
- **Build:** `npm install && npm run build`
- **Start:** `npm start`
- **Environment:** `TORII_DATA_DIR` pointing at the disk, plus `SESSION_SECRET` and `SIMULATOR_WEBHOOK_SECRET`

## Demo access

There are no passwords. Choose a person on the home page or at `/switch`; permissions are still enforced on the server for whoever you pick.

| Person | Role | What they do |
|---|---|---|
| Haruka Sato | IP owner · licensing lead | Publishes the kit; **the only person who can approve** |
| Daichi Mori | IP owner · brand coordinator | Can request changes or reject, but not approve |
| Riya Menon | Creator · Chai & Cels Collective | Builds and publishes campaigns |
| Kabir Shah | Creator · Panel Theory | Owns the failed poster run and the blocked glassware draft |
| Aarav Gupta | Fan | Preorders and tracks orders |
| Meera Iyer | Torii operator | Production release, fulfilment, refunds, terms |

## Seeded scenarios

The seed replays history through the real domain code with a simulated clock, so every seeded record passed the same checks, approvals, payment events and ledger posts as anything created in the UI.

| Campaign | State | Shows |
|---|---|---|
| **First Flight Tee** | Completed | 100 delivered units at ₹699 + 3 refunds → royalty ₹6,990, creator ₹5,592, Torii ₹8,388 |
| **Midnight Delivery Tee** | Live, 45/50 paid | v1 changes requested → v2 approved & live → v3 pending fresh approval |
| **Monsoon Route Poster** | Deadline missed, 13/40 | Cancellation and refund workflow |
| **Courier Club Pocket Tee** | Awaiting first review | Owner review queue |
| **Courier Chai Glass** | Draft, blocked | Glassware refused by the backend: the kit permits only T-shirts and posters |

## How it works

```
Owner kit (versioned rules + files)
   └─► Creator draft ──save──► campaign_versions (content, fingerprint, preview, checks)
           └─submit─► server rule checks ──fail──► 422 with plain reasons
                          └─pass─► owner review ──approve──► review row bound to the fingerprint
                                                      └─publish─► fan page serves that exact version
Fan checkout ─► order (+ price from the version) ─► payment adapter ─► simulator
Simulator ─signed event─► webhook processor ─► payment_events (unique) ─► order paid + ledger capture
Operator ─► release / ship / deliver (ledger allocations) or cancel (refunds, each once)
Statement ◄─ ledger totals, cross-checked against a fresh recalculation from orders
```

**Stack.** One Next.js 16 (App Router) + TypeScript app. Built-in SQLite via `node:sqlite`, raw SQL in a thin domain layer (`src/lib/domain`). Uploads on local disk. zod validation. Tailwind v4.

**Key records** (`src/lib/schema.ts`): users, kits, kit_versions, assets, campaigns, campaign_versions, reviews, orders, payment_intents, payment_events, payment_event_deliveries, refunds, ledger_entries, settings, audit_log. The payment simulator keeps its own `sim_*` tables, as an external provider would.

### Guarantees and where they live

- **Forbidden products are refused by the backend:** `submitVersion` and `reviewVersion` re-run `runRuleChecks` (`src/lib/domain/rules.ts`) and throw a 422 with each failing rule in plain language. The editor's live checks call the same function, but nothing trusts the client.
- **Approval can't carry over:** submitted versions are frozen. Editing creates a new version. A review stores the content fingerprint (SHA-256 of canonical content + kit version). `isApproved` recomputes the fingerprint and requires a matching review by the kit's named approver before anything can be published.
- **Orders keep their version:** each order stores `campaign_version_id` and its own unit price. Prices always come from the server.
- **No double-counted payments:** `payment_events` has `UNIQUE(provider, provider_event_id)`. The order moves to paid with a conditional update, and the ledger capture has an idempotency key. Checkout double-submits reuse a `checkout_key`.
- **No double refunds:** one refund row per order (`UNIQUE(order_id)`). The provider is called with that row's id as its idempotency key, and the ledger refund entry is keyed by refund id. Cancelling twice only picks up what's outstanding. Payments that land after preorders close are refunded automatically.
- **Statements reconcile:** money is integer paise. Allocations are posted per order on delivery, rounded down, with the seller taking the remainder. The statement compares ledger totals with a fresh recalculation and shows four reconciliation checks.
- **Survives refresh/restart:** all state is in SQLite. A test closes and reopens the database mid-workflow.

`npm test` (25 tests, `tests/workflow.test.ts`) covers each of these.

### What's real, simulated, or future

| Real in the prototype | Simulated | Needs a partner or integration |
|---|---|---|
| Kit versioning, uploads, rule checks, approvals, fingerprints | Payments and refunds (`src/lib/domain/payments/simulator.ts`, behind the `PaymentProvider` adapter) | A live payment provider (e.g. Razorpay/Stripe) implementing `PaymentProvider` |
| Order lifecycle, threshold, production release, fulfilment states | The property, partners, people and terms | Payouts to licensor, creator and seller |
| Idempotent webhook processing, ledger, statement, CSV export | The clock in seeded history | Real fulfilment/courier tracking, tax (GST) treatment, real accounts and auth |

Rule checks enforce declared kit rules only. They do not establish copyright ownership or replace human creative and commercial judgement.

### Optional AI brief assistant

In the creator workspace, *Brief assistant* turns a brief (e.g. "Prepare two streetwear directions for my college audience") into two directions. They're built only from this kit's products, layouts and asset IDs.

With `ANTHROPIC_API_KEY` set, it calls Claude Opus 5.5 with schema-constrained output and server-side refusal fallback enabled. The schema's enums come from the kit, so Claude can't name an asset that doesn't exist. Without a key it uses deterministic templates. Either way the result is validated and rule-checked on the server, nothing is saved automatically, and a human still approves.

## Design

A "print proof" studio language:

- Near-white paper, deep ink, and a single vermilion signal colour.
- Geist for structure, Geist Mono for data, Instrument Serif for editorial moments.
- A line-drawn torii gate frames the hero product.
- Every preview sits inside printer's crop marks; approvals carry a hanko-style seal stamped with the version fingerprint.
- The five-stage rail (一 二 三 四 五) shows where each screen sits.
- Production thresholds are drawn as a gate the progress bar passes through.

See `DEMO.md` for the three-minute demonstration script.
