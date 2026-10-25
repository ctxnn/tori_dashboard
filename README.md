# Torii 鳥居

**The gate between a licensed kit and a paid preorder.** Torii brings official Japanese IP to Indian fans and turns that popularity into revenue, built for the Thapar Japan Hackathon’s JETRO challenge. One app, three surfaces:

| Surface | Who it's for | Where |
|---|---|---|
| **Collaboration workspace** | Japanese IP owners and Indian creators prepare, approve, launch and track official merchandise collaborations; Torii operations runs production, refunds and statements | `/`, `/owner`, `/creator`, `/ops`, `/proof` |
| **Fan app** (phone-first) | Fans read official manga in five Indian languages, buy India-printed volumes and licensed figures, back creator collabs before they're made, and verify anything they own | `/read`, `/manga`, `/figures`, `/collabs`, `/shelf`, `/verify` |
| **Partner Portal** | Japanese publishers bring their series to India, see who reads them, and follow their merch collabs | `/partner` |

> Demonstration build. *Sky Courier*, Kumo Lantern Studio, the creators, the seller (Indigo Thread Co.) and every commercial term are fictional. All payments run through clearly labelled test simulators. The fan app's catalogue uses real series names with covers, banners and synopses from [AniList](https://anilist.co), shown for demonstration only; the publisher accounts are demo accounts with no affiliation to those companies.

The hypothesis under test: *reusable assets, approvals and reporting make smaller creator collaborations easier to operate.* The prototype demonstrates the workflow end to end; it does not prove the advantage.

## Built for the brief (JETRO-PS-02)

The challenge asks how Japanese content companies turn popularity in India into sustainable revenue, along a four-stage chain. Each stage is a working part of Torii:

| Brief stage | In Torii | Where |
|---|---|---|
| **Audience discovery** | Fan pulse (city, age, what they'd buy, what they'd pay, where and in which language they watch) and owner insights: India demand map, price-reach curve, products asked for but not in the kit, plain-language findings, optional Claude summary | `/pulse`, `/audience` |
| **Localisation & distribution** | Versioned asset kits; Indian creators design for their own audience, language and channels; rules checked by the server; one exact version approved | `/owner/kit`, `/creator`, reviews |
| **Monetisation & merch** | Paid preorders with a production gate, refunds on a miss, royalties recorded on delivery, reconciled statements | `/c/…`, `/ops`, `/statements/…` |
| **Community retention** | Fan passport (stamp book), follows, backers' day early access, authenticity tags with QR codes and a public verify page | `/fan`, `/verify` |

`/pitch` presents the same story as a nine-slide deck with live numbers.

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

**Reset:** the *Reset demo* link (top bar, or the bottom of the home page) restores the seeded data, for the workspace and the fan app together. It only touches the local `data/` directory. Deleting `data/` and restarting does the same.

## Fan app and Partner Portal

The fan app and the Partner Portal began as a separate prototype ([prathamgarg1103/torii](https://github.com/prathamgarg1103/torii)) and now run inside this app, keeping their own look: coloured newsprint per section like a manga weekly, Dela Gothic One headings, a phone-width column with bottom navigation. The two halves share one database, one set of demo people and one reset.

**How they connect**

- **Collabs tab.** Every published collaboration appears in the fan app: its own tab (`/collabs`), a row on the Read home and on Figures, and on the series it belongs to. Tapping one opens the campaign page to preorder.
- **Sky Courier is a series.** The fictional property the workspace is built around is readable in the fan app (`/read/sky-courier`), published by the same IP owner, Kumo Lantern Studio, with its official merch underneath.
- **One person, everywhere.** The demo people at `/switch` are signed in across all three surfaces. Aarav's Shelf shows his manga, figures *and* collab preorders with their authenticity codes. Haruka opens Kumo Lantern Studio's Partner Portal without a password. Meera (Torii operations) is the store admin who reviews publishers' titles.
- **Merch collabs in the Partner Portal.** `/partner/merch` shows a publisher its kits, the collaborations Indian creators made from them, designs waiting for approval and royalties earned, read from the same ledger as `/proof`.
- **One verifier.** `/verify` scans book and figure tags (`T1-…`) and collab tags (`SC-…`); a collab tag opens its full approval record.

**What the fan app adds:** chapters free at launch or ₹9 each (admin switch at `/publisher`), a UPI wallet and mock UPI checkout, cart and orders (`/store/orders`), My Shelf with gaps in your collection, an India reading dashboard for publishers (`/publisher`), and a review queue for partner titles (`/publisher/review`). Publishers upload chapters per language in the Partner Portal; once Torii approves, the series goes live in Read.

**Other ways in:** the fan app also accepts any Indian mobile number with OTP `123456` (`9876543210` is Aarav). Partner Portal password accounts: `partner@kumolantern.example`, `partner@shueisha.example`, `partner@kodansha.example`, all with password `torii-demo`.

**Store data.** The catalogue (402 series: AniList's 400 most popular manga plus the built-in ones, with Sky Courier; 26 figures; 1,800 reading and sales events) is bundled from `src/store/data/catalog.json`; everything that changes is one JSON document in the `store_state` table, and uploaded pages live in `data/store-uploads/`. To rebuild the catalogue after editing `scripts/store/seed.ts`:

```bash
npm run store:seed
```

To refresh the AniList data (needs internet, about a minute; commit `scripts/store/anilist.json` and the catalogue afterwards). `node scripts/store/import-anilist.mjs --characters` refreshes only the figures' character art:

```bash
npm run store:import
```

Any card without bundled art looks itself up on AniList in the viewer's browser.

## Proof dashboard

`/proof` turns the hypothesis into nine measurable claims. Each claim has a pilot target and a live value computed from the app's own records: reviews, the audit trail, orders and the ledger. The page covers:

- **Owners decide quickly:** time from submission to decision, and the queue waiting now.
- **Few rounds of back-and-forth:** review rounds before approval.
- **Rules filter before people do:** submissions refused by the rule checks, and a count of proposals that reached a reviewer while breaking a rule (should be 0).
- **One kit, many collaborations:** kit and artwork reuse.
- **Demand is tested before anything is made:** each campaign's paid units over time against its gate, the gate hit rate, and the path from checkout to delivery.
- **The money can be trusted:** earnings per collaboration, reconciliation, and integrity counters (double charges, double refunds, sales of unapproved versions).
- **Demand is known before launch:** pulse answers collected before the first campaign opened, and the share of those fans who later paid.
- **Fans come back:** the share of backers who backed a second run, backers' day orders and follows.
- **Every item can be verified:** shipped units with their own tag, tag checks, and lookups for codes that were never issued.

The targets live in `src/lib/domain/proof.ts` (`TARGETS`). They are the pilot hypothesis, not industry benchmarks. With seeded data the page shows what Torii can measure; in a pilot the same page records real evidence.

## Fan pulse and audience insights

`/pulse` is public: six quick answers, one per email per property (answering again updates it). A signed-in fan also follows the property. `/audience` (owner of that property, creators, operators) shows the aggregate next to what fans actually paid for: a dot-matrix India map (sun size = interested fans, ink core = paid backers), findings such as untapped regions and price reach, products fans want that the kit doesn't permit, regions, ages, languages and channels.

*Summarise* turns the aggregates into three next moves. With `ANTHROPIC_API_KEY` set it asks Claude Opus 5.5 (schema-constrained output, aggregates only — no emails or individual answers leave the app); otherwise Torii computes the summary from the findings.

## Passport, follows and backers' day

`/fan` is the fan's stamp book: one hanko stamp per run backed, their authenticity tags, drops from what they follow, and order history. A fan with a paid, unrefunded order on a property is a **backer**; backers can preorder a new campaign from that property one day before it opens to everyone (`launchPhase` and `canOrder` in `src/lib/domain`). The seeded *Festival of Lanterns Poster* opens the day after a reset, so its backers' day is live right after resetting.

## Authenticity tags

When an operator marks orders shipped, every unit gets one code (`authenticity_codes`: unique per unit, serial-numbered within the run, bound to the approved version's content hash). The order page and passport show the tag with a QR code that points at `/verify/<code>` on whatever host served the page, so it works through the demo tunnel. The verify page shows licensor, approver, design version and fingerprint, flags tags from returned items or with a broken approval, cautions after repeated checks, and logs lookups of codes that don't exist.

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
| Haruka Sato | IP owner · licensing lead | Publishes the kit; **the only person who can approve**. Opens Kumo Lantern Studio's Partner Portal |
| Daichi Mori | IP owner · brand coordinator | Can request changes or reject, but not approve |
| Riya Menon | Creator · Chai & Cels Collective | Builds and publishes campaigns |
| Kabir Shah | Creator · Panel Theory | Owns the failed poster run and the blocked glassware draft |
| Aarav Gupta | Fan | Backed three runs (one delivered, with a tag); follows Sky Courier and Riya; has backers' day access. Lands in the fan app with ₹50 in his wallet |
| Meera Iyer | Torii operator | Production release, fulfilment, refunds, terms. Store admin: reading mode, publisher review queue, India reading dashboard |

## Seeded scenarios

The seed replays history through the real domain code with a simulated clock, so every seeded record passed the same checks, approvals, payment events and ledger posts as anything created in the UI.

| Campaign | State | Shows |
|---|---|---|
| **First Flight Tee** | Completed | 100 delivered units at ₹699 + 3 refunds → royalty ₹6,990, creator ₹5,592, Torii ₹8,388 |
| **Midnight Delivery Tee** | Live, 45/50 paid | v1 changes requested → v2 approved & live → v3 pending fresh approval |
| **Monsoon Route Poster** | Deadline missed, 13/40 | Cancellation and refund workflow |
| **Courier Club Pocket Tee** | Awaiting first review | Owner review queue |
| **Courier Chai Glass** | Draft, blocked | Glassware refused by the backend: the kit permits only T-shirts and posters |
| **Festival of Lanterns Poster** | Approved, opens tomorrow | Backers' day: only past backers (Aarav) can preorder today |

Also seeded: about 600 fan pulse answers across 18 Indian cities (most before the first launch), repeat buyers (a share of First Flight's backers came back for Midnight), and 100 authenticity tags for First Flight's delivered units.

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

**Key records** (`src/lib/schema.ts`): users, kits, kit_versions, assets, campaigns, campaign_versions, reviews, orders, payment_intents, payment_events, payment_event_deliveries, refunds, ledger_entries, settings, audit_log, interest_signals, follows, authenticity_codes, authenticity_scans. The payment simulator keeps its own `sim_*` tables, as an external provider would.

### Guarantees and where they live

- **Forbidden products are refused by the backend:** `submitVersion` and `reviewVersion` re-run `runRuleChecks` (`src/lib/domain/rules.ts`) and throw a 422 with each failing rule in plain language. The editor's live checks call the same function, but nothing trusts the client.
- **Approval can't carry over:** submitted versions are frozen. Editing creates a new version. A review stores the content fingerprint (SHA-256 of canonical content + kit version). `isApproved` recomputes the fingerprint and requires a matching review by the kit's named approver before anything can be published.
- **Orders keep their version:** each order stores `campaign_version_id` and its own unit price. Prices always come from the server.
- **No double-counted payments:** `payment_events` has `UNIQUE(provider, provider_event_id)`. The order moves to paid with a conditional update, and the ledger capture has an idempotency key. Checkout double-submits reuse a `checkout_key`.
- **No double refunds:** one refund row per order (`UNIQUE(order_id)`). The provider is called with that row's id as its idempotency key, and the ledger refund entry is keyed by refund id. Cancelling twice only picks up what's outstanding. Payments that land after preorders close are refunded automatically.
- **Statements reconcile:** money is integer paise. Allocations are posted per order on delivery, rounded down, with the seller taking the remainder. The statement compares ledger totals with a fresh recalculation and shows four reconciliation checks.
- **Survives refresh/restart:** all state is in SQLite. A test closes and reopens the database mid-workflow.

- **One tag per unit, issued once:** `UNIQUE(order_id, unit_no)` and `UNIQUE(campaign_id, serial_no)`; re-running shipping issues nothing new.
- **Backers' day is enforced on the server:** `canOrder` only lets a signed-in fan with a qualifying order on the same property in before launch day.

`npm test` (33 tests, `tests/workflow.test.ts`) covers each of these.

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

The workspace and the Partner Portal come in two looks, switched with the **New look / Classic** pill in the bottom-right corner of every page (it sets the `torii_ui` cookie through `/api/ui`). The fan app has one look and ignores the switch.

**New look** (the default), after heyclicky.com and folk.com:

- A soft grey canvas with a dotted grid, Inter set tight, lowercase headlines, and Averia Serif Libre for accent words.
- Glossy "gel" pill buttons in blue, aqua, white and black; the torii red stays on the mark, stickers and hanko stamps.
- macOS-style windows, chat bubbles that tell the collaboration story, lavender cards, and draggable die-cut stickers on the landing page.
- A light Partner Portal console in place of the dark sidebar.
- Everything lives in `src/components/v2/*` and `src/app/v2.css`. Every rule there is scoped to `html[data-ui="new"]`, and classic pages take on the look through small `ui-*` class hooks in `src/components/ui.tsx`.

**Classic**, the original "print proof" studio language with Japanese craft motifs:

- Near-white paper, deep ink, and a single vermilion signal colour.
- Geist for structure, Geist Mono for data, Instrument Serif for editorial moments.
- A line-drawn torii gate frames the hero product.
- Every preview sits inside printer's crop marks; approvals carry a hanko-style seal stamped with the version fingerprint.
- The five-stage rail (line icons: kit, pen, seal, bag, chart) shows where each screen sits.
- Patterns and illustrations, drawn as SVG/CSS: seigaiha waves, shippō circles, washi paper grain, Mount Fuji, golden mist bands, falling sakura, ukiyo-e wave crests, square hanko stamps (`src/components/japan.tsx`, pattern classes in `globals.css`).
- Production thresholds are drawn as a gate the progress bar passes through.

See `DEMO.md` for the three-minute demonstration script.
