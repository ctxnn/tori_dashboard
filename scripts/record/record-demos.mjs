// Records the "How it works" walkthrough videos by driving the real app in a
// headless browser. Usage: npm run record:demos (see README).
//
// Expects a Torii server at REC_BASE (default http://localhost:3100) running on a
// throwaway data dir. Resets the demo first, then records one video per login in
// order, so each video picks up where the previous one left off.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.REC_BASE || "http://localhost:3100";
const OUT = path.resolve("public/demo-videos");
const RAW = path.resolve(process.env.REC_RAW || ".record-tmp");
const MANIFEST = path.resolve("src/lib/demo-videos.json");
const W = 1440;
const H = 810;
const overlay = fs.readFileSync(path.resolve("scripts/record/overlay.js"), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Take {
  constructor(page, meta) {
    this.page = page;
    this.meta = meta;
    this.t0 = Date.now();
    this.chapters = [];
    this.n = 0;
    this.x = W / 2;
    this.y = H / 2;
  }
  elapsed() {
    return Math.max(0, (Date.now() - this.t0) / 1000);
  }
  async card({ kanji, eyebrow, title, sub }, ms = 3200, keep = false) {
    const mark = `<svg viewBox="0 0 32 32" fill="currentColor"><path d="M1.5 5.2 Q16 9.6 30.5 5.2 L29.6 8.6 Q16 11.6 2.4 8.6 Z"/><rect x="4.6" y="13" width="22.8" height="2.4" rx="0.4"/><rect x="7.6" y="9.6" width="2.8" height="19.4" rx="0.4"/><rect x="21.6" y="9.6" width="2.8" height="19.4" rx="0.4"/><rect x="14.8" y="10.4" width="2.4" height="2.8"/></svg>`;
    await this.page.evaluate((h) => window.__rec?.card(h), `<div class="k">${mark}</div>${kanji ? `<div class="n">${kanji}</div>` : ""}<div class="eyebrow">${eyebrow}</div><div class="t">${title}</div><div class="s">${sub}</div>`);
    await sleep(ms);
    if (keep) return;
    await this.page.evaluate(() => window.__rec?.card(null));
    await sleep(700);
  }
  async step(text, dwell = 2200) {
    this.n++;
    this.chapters.push({ t: Math.round(this.elapsed() * 10) / 10, title: text });
    await this.page.evaluate(
      ([t, n, r, c]) => window.__rec?.caption(t, n, r, c),
      [text, String(this.n).padStart(2, "0"), this.meta.role, this.meta.color],
    );
    await sleep(dwell);
  }
  async moveTo(x, y) {
    const d = Math.hypot(x - this.x, y - this.y);
    await this.page.mouse.move(x, y, { steps: Math.max(12, Math.min(45, Math.round(d / 16))) });
    this.x = x;
    this.y = y;
  }
  async point(locator) {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    await locator.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
    await sleep(650);
    const b = await locator.boundingBox();
    await this.moveTo(b.x + b.width / 2, b.y + b.height / 2);
    return b;
  }
  async click(locator, pause = 700) {
    const b = await this.point(locator);
    await this.page.evaluate((r) => window.__rec?.ring(r), { x: b.x, y: b.y, w: b.width, h: b.height });
    await sleep(320);
    await this.page.mouse.down();
    await this.page.mouse.up();
    await sleep(160);
    await this.page.evaluate(() => window.__rec?.ring(null));
    await sleep(pause);
  }
  async type(locator, text) {
    await this.click(locator, 200);
    await this.page.keyboard.press("ControlOrMeta+A");
    await this.page.keyboard.type(text, { delay: 55 });
    await sleep(400);
  }
  async scrollTo(locator, wait = 900) {
    await locator.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
    await sleep(wait);
  }
  async scrollBy(px, wait = 900) {
    await this.page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), px);
    await sleep(wait);
  }
  async settle(ms = 1200) {
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await sleep(ms);
  }
  async signInFromHome(name) {
    const p = this.page;
    await p.goto(`${BASE}/`);
    await this.settle(2600);
    await this.scrollTo(p.locator("#enter"), 1200);
    await this.click(p.getByRole("button", { name: new RegExp(name) }));
    await this.settle();
  }
}

const SCENES = [
  {
    id: "owner",
    role: "IP owner · Haruka Sato",
    color: "#e2402a",
    title: "The IP owner",
    blurb: "Publish an authorised kit, review a creator’s proposal against it, and approve one exact version.",
    card: { kanji: "Stages 一 & 三", eyebrow: "Torii walkthrough · 1 of 4", title: "The IP owner", sub: "Haruka Sato, licensing lead at Kumo Lantern Studio, sets the rules and approves what gets made." },
    async run(t) {
      const p = t.page;
      await p.goto(`${BASE}/`);
      await t.settle(1500);
      await t.card(this.card);
      await t.step("Start on the home page. Each person in the collaboration has their own login.", 2400);
      await t.scrollTo(p.locator("#enter"), 1300);
      await t.step("Choose Haruka Sato — the IP owner and the kit’s named approver.", 1200);
      await t.click(p.getByRole("button", { name: /Haruka Sato/ }));
      await t.settle();
      await t.step("Her overview: proposals waiting for a decision, her kit, and every collaboration.", 2600);
      await t.scrollBy(520, 1400);
      await t.scrollBy(-520, 600);
      await t.click(p.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Asset kit" }));
      await t.settle();
      await t.step("The authorised kit: explicit rules for products, territory, dates, price band and approver.", 3000);
      await t.scrollTo(p.locator("main").getByText("Artwork library"), 1200);
      await t.step("Original artwork is uploaded here, then included in a published kit version.", 2600);
      await t.scrollTo(p.locator("main").getByText("Permitted products and price bands"), 1200);
      await t.step("Changing the rules publishes a new kit version. Earlier proposals keep the rules they were judged by.", 3000);
      await t.click(p.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Overview" }));
      await t.settle();
      await t.click(p.locator("li", { hasText: "Midnight Delivery Tee" }).getByRole("link", { name: "Open review" }));
      await t.settle();
      await t.step("The review screen shows the exact creative — before and after, generated from saved design data.", 3000);
      await t.scrollTo(p.locator("main").getByText("What changed since"), 1200);
      await t.step("Every change since the last approved version is listed. Approval never carries over.", 3000);
      await t.scrollTo(p.locator("main").getByText("Creator’s contribution"), 1200);
      await t.step("The creator’s contribution: audience, local angle and distribution plan.", 2600);
      await t.scrollTo(p.locator("main").getByText("Human approval"), 1200);
      await t.step("Every declared rule is re-checked on the server before a decision.", 2400);
      const approve = p.getByRole("button", { name: /Approve version/ });
      await t.point(approve);
      await t.step("Approve. Haruka’s decision is bound to this version’s fingerprint.", 1400);
      await t.click(approve, 1500);
      await t.settle(600);
      await t.scrollTo(p.locator("main").getByText("Your decision"), 1000);
      await t.step("Approved — sealed with the version number and fingerprint. Any later edit needs fresh approval.", 3600);
    },
  },
  {
    id: "creator",
    role: "Creator · Kabir & Riya",
    color: "#17493a",
    title: "The creator",
    blurb: "Get refused for an unlicensed product, build a new proposal inside the kit, use the brief assistant, submit, and publish.",
    card: { kanji: "Stage 二", eyebrow: "Torii walkthrough · 2 of 4", title: "The creator", sub: "Indian creators bring product direction, audience understanding and distribution — inside the owner’s kit." },
    async run(t) {
      const p = t.page;
      await p.goto(`${BASE}/`);
      await t.settle(1500);
      await t.card(this.card);
      await t.scrollTo(p.locator("#enter"), 1200);
      await t.step("Creators log in the same way. First, Kabir Shah of Panel Theory.", 1400);
      await t.click(p.getByRole("button", { name: /Kabir Shah/ }));
      await t.settle();
      await t.click(p.getByRole("link", { name: /Courier Chai Glass/ }));
      await t.settle();
      await t.step("Kabir drafted a glassware product. The kit licenses only T-shirts and posters.", 2800);
      await t.click(p.getByRole("button", { name: "Submit for approval" }), 1200);
      await t.scrollBy(-400, 600);
      await t.step("The server refuses the submission — and explains why in plain language.", 3400);
      await t.click(p.getByRole("link", { name: /Signed in as/ }));
      await t.settle();
      await t.step("Switch to Riya Menon, who runs 22 college anime clubs in Delhi NCR.", 1400);
      await t.click(p.getByRole("button", { name: /Riya Menon/ }));
      await t.settle();
      await t.step("Riya’s studio: her campaigns, their versions, and preorder progress.", 2400);
      await t.type(p.getByPlaceholder("e.g. Exam Week Courier Tee"), "Exam Season Courier Tee");
      await t.click(p.getByRole("button", { name: "Create draft" }));
      await t.settle(1500);
      await t.step("A private draft inside the kit’s latest rules. Rule checks run on the server as she edits.", 2600);
      await t.click(p.getByRole("button", { name: /Brief assistant/ }));
      await t.step("Optional brief assistant: two directions built only from this kit’s artwork and templates.", 1600);
      await t.type(p.locator("#brief"), "Two streetwear directions for my college audience during exam season");
      await t.click(p.getByRole("button", { name: "Suggest directions" }), 2200);
      await t.scrollTo(p.getByRole("button", { name: "Use this direction" }).first(), 1200);
      await t.step("Each suggestion is validated against the kit. Nothing is saved until Riya chooses.", 2600);
      await t.click(p.getByRole("button", { name: "Use this direction" }).first(), 1200);
      await t.click(p.getByRole("button", { name: /Brief assistant/ }));
      await t.scrollTo(p.getByRole("tab", { name: /Design/ }), 900);
      await t.step("Now make it hers: approved artwork, colour and her own print line. The preview updates live.", 1800);
      await t.click(p.getByRole("radio", { name: /Night Route/ }));
      await t.click(p.getByRole("radio", { name: "Sumi ink", exact: true }));
      await t.type(p.locator("#line1"), "Exam ka mausam");
      await t.type(p.locator("#line2"), "LATE NIGHT ROUTE · HOSTEL DROP");
      await t.click(p.getByRole("radio", { name: "Ivory", exact: true }));
      await t.point(p.getByLabel("Live product preview"));
      await sleep(1500);
      await t.click(p.getByRole("tab", { name: /Distribution/ }));
      await t.step("Her contribution beyond design: who it’s for and how fans will hear about it.", 1600);
      await t.click(p.getByRole("checkbox", { name: "Instagram" }));
      await t.click(p.getByRole("checkbox", { name: "Campus fest stall" }));
      await t.click(p.getByRole("tab", { name: /Offer/ }));
      await t.scrollTo(p.locator("main").getByText("If you hit the threshold"), 1200);
      await t.step("Price, production threshold and dates — with a live split of who earns what.", 3000);
      await t.click(p.getByRole("button", { name: "Save draft" }), 1400);
      await t.click(p.getByRole("button", { name: "Submit for approval" }), 1600);
      await t.scrollBy(-600, 700);
      await t.step("Submitted and locked, so the owner reviews exactly what was sent.", 3000);
      await t.click(p.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Studio" }));
      await t.settle();
      await t.click(p.getByRole("link", { name: /Midnight Delivery Tee/ }));
      await t.settle();
      await t.step("Midnight Delivery Tee v3 has been approved by Haruka. Riya publishes it.", 2000);
      await t.click(p.getByRole("button", { name: /Replace live page with v3/ }), 1500);
      await t.step("Live. New orders get v3; everyone who bought v2 keeps v2.", 3200);
    },
  },
  {
    id: "fan",
    role: "Fan · Aarav Gupta",
    color: "#b3872c",
    title: "The fan",
    blurb: "Find an official campaign, preorder in test mode, pay through the simulator, and track the order.",
    card: { kanji: "Stage 四", eyebrow: "Torii walkthrough · 3 of 4", title: "The fan", sub: "Fans pay before anything is made. If the production gate isn’t reached, everyone is refunded." },
    async run(t) {
      const p = t.page;
      await p.goto(`${BASE}/`);
      await t.settle(1500);
      await t.card(this.card);
      await t.scrollTo(p.locator("#enter"), 1200);
      await t.step("Log in as Aarav Gupta, a Sky Courier fan in Patiala.", 1400);
      await t.click(p.getByRole("button", { name: /Aarav Gupta/ }));
      await t.settle();
      await t.step("Official campaigns, each approved by the IP owner, with a production gate.", 2600);
      await t.click(p.getByRole("link", { name: /Midnight Delivery Tee/ }).first());
      await t.settle();
      await t.step("The campaign page: approved design, creator, price and deadline.", 2600);
      await t.scrollTo(p.locator("main").getByText("Production gate"), 1000);
      await t.step("45 of 50 paid. Five more preorders unlock production.", 2400);
      await t.click(p.locator("main").getByText("XXL", { exact: true }));
      const more = p.getByRole("button", { name: "One more" });
      for (let i = 0; i < 4; i++) await t.click(more, 250);
      await t.step("Choose size and quantity. The full total is shown before paying.", 2000);
      await t.click(p.getByRole("button", { name: /^Preorder/ }));
      await t.settle(1400);
      await t.step("Test-mode payment simulator: clearly labelled, no real money moves.", 2600);
      const simulatorUrl = p.url();
      await t.click(p.getByRole("button", { name: /Simulate successful payment/ }));
      await t.settle(1400);
      await t.step("Payment confirmed by a signed webhook on the server. The production gate is reached.", 3000);
      await t.scrollTo(p.locator("main").getByText("Payment events"), 1200);
      await t.step("Every payment event Torii received is listed here.", 2200);
      await p.goto(simulatorUrl);
      await t.settle(1200);
      await t.click(p.getByRole("button", { name: /Resend the same webhook event/ }), 1400);
      await t.step("Resending the same event is recognised as a duplicate. The order is counted once.", 3200);
      await t.click(p.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "My orders" }));
      await t.settle();
      await t.step("Aarav’s orders. Each keeps the exact design version he paid for.", 3200);
    },
  },
  {
    id: "operator",
    role: "Torii operator · Meera Iyer",
    color: "#2c5a86",
    title: "The Torii operator",
    blurb: "Release production, ship and deliver, prove idempotency, cancel and refund a missed run, and read the statement.",
    card: { kanji: "Stage 五", eyebrow: "Torii walkthrough · 4 of 4", title: "The Torii operator", sub: "Production decisions, fulfilment, refunds and a statement that reconciles to every order." },
    async run(t) {
      const p = t.page;
      await p.goto(`${BASE}/`);
      await t.settle(1500);
      await t.card(this.card);
      await t.scrollTo(p.locator("#enter"), 1200);
      await t.step("Log in as Meera Iyer from Torii operations.", 1400);
      await t.click(p.getByRole("button", { name: /Meera Iyer/ }));
      await t.settle();
      await t.step("Every campaign, with anything that needs a decision flagged.", 2600);
      await t.click(p.locator("tr", { hasText: "Midnight Delivery Tee" }).getByRole("link", { name: /Manage/ }));
      await t.settle();
      await t.step("Midnight has passed its gate: 50 of 50 paid. Release it to production.", 2000);
      await t.click(p.getByRole("button", { name: "Release to production" }), 1600);
      await t.step("Ship, then deliver. Earnings are written to the ledger only on delivery.", 1600);
      await t.click(p.getByRole("button", { name: /^Mark \d+ orders? shipped$/ }), 1400);
      await t.click(p.getByRole("button", { name: /delivered$/ }), 1600);
      await t.click(p.getByRole("button", { name: "Replay all provider events" }), 1600);
      await t.scrollTo(p.locator("main").getByText(/events redelivered/), 800);
      await t.step("Replaying every payment event: all recognised as duplicates, ledger unchanged.", 3400);
      await t.click(p.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Operations" }));
      await t.settle();
      await t.click(p.locator("tr", { hasText: "Monsoon Route Poster" }).getByRole("link", { name: /Manage/ }));
      await t.settle();
      await t.step("Monsoon Route Poster missed its deadline at 13 of 40. Cancel and refund.", 2000);
      await t.click(p.getByRole("button", { name: /Cancel campaign/ }), 900);
      await t.click(p.getByRole("button", { name: /Confirm cancel/ }), 2200);
      await t.scrollTo(p.locator("main").getByText(/orders refunded/), 800);
      await t.step("Every paid order refunded exactly once. Running it again changes nothing.", 3200);
      await t.click(p.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Operations" }));
      await t.settle();
      await t.click(p.locator("tr", { hasText: "First Flight Tee" }).getByRole("link", { name: /Manage/ }));
      await t.settle();
      await t.click(p.getByRole("link", { name: "Statement" }));
      await t.settle(1200);
      await t.step("The statement. ₹69,900 net item sales on 100 delivered units.", 2400);
      await t.step("Licensor ₹6,990 · creator ₹5,592 · Torii ₹8,388 — revenue before expenses, not profit.", 3600);
      await t.scrollTo(p.locator("main").getByText("Everything reconciles"), 1200);
      await t.step("Ledger totals are recomputed from orders and checked — including the refunds.", 3200);
      await t.scrollTo(p.locator("main").getByText("Estimated seller economics"), 1200);
      await t.step("Cost assumptions are kept apart from recorded figures. Every number links to its orders.", 3200);
      await t.point(p.getByRole("link", { name: "Export CSV" }));
      await t.step("Export the statement as CSV for partners.", 2600);
    },
  },
];

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
}

function duration(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString();
  return Math.round(parseFloat(out) * 10) / 10;
}

async function main() {
  const res = await fetch(`${BASE}/api/demo/reset`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: "reset" }) });
  if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(RAW, { recursive: true });
  const only = process.argv[2];
  const browser = await chromium.launch();
  const manifest = { recordedAt: new Date().toISOString(), size: { width: W, height: H }, videos: [] };

  for (const scene of SCENES) {
    if (only && scene.id !== only) continue;
    const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: RAW, size: { width: W, height: H } }, deviceScaleFactor: 1 });
    await context.addInitScript(overlay);
    const page = await context.newPage();
    const take = new Take(page, scene);
    console.log(`● recording ${scene.id}`);
    try {
      await scene.run(take);
      await page.evaluate(() => window.__rec?.caption(null));
      await take.card({ kanji: "鳥居", eyebrow: "Torii · demonstration build", title: scene.title, sub: "Fictional property, partners and terms. Payments run in test mode." }, 3000, true);
    } catch (err) {
      await page.screenshot({ path: path.join(RAW, `${scene.id}-error.png`) });
      throw err;
    }
    const video = page.video();
    await context.close();
    const webm = path.join(RAW, `${scene.id}.webm`);
    await video.saveAs(webm);
    const mp4 = path.join(OUT, `${scene.id}.mp4`);
    // High-quality H.264 for browsers and presentation software alike.
    ffmpeg(["-i", webm, "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", "-an", mp4]);
    const posterAt = take.chapters[1]?.t ?? 4;
    ffmpeg(["-ss", String(posterAt + 1), "-i", mp4, "-frames:v", "1", "-q:v", "3", path.join(OUT, `${scene.id}.jpg`)]);
    manifest.videos.push({ id: scene.id, title: scene.title, role: scene.role, color: scene.color, blurb: scene.blurb, src: `/demo-videos/${scene.id}.mp4`, poster: `/demo-videos/${scene.id}.jpg`, duration: duration(mp4), chapters: take.chapters });
    console.log(`  ✓ ${scene.id}.mp4 (${duration(mp4)}s, ${take.chapters.length} chapters)`);
  }
  await browser.close();

  if (!only) {
    // One continuous film for presentations.
    const list = path.join(RAW, "concat.txt");
    fs.writeFileSync(list, manifest.videos.map((v) => `file '${path.join(OUT, `${v.id}.mp4`)}'`).join("\n"));
    const full = path.join(OUT, "torii-full-walkthrough.mp4");
    ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", full]);
    manifest.full = { src: "/demo-videos/torii-full-walkthrough.mp4", duration: duration(full) };
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`✓ full walkthrough ${manifest.full.duration}s → ${full}`);
  } else {
    const existing = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { videos: [] };
    existing.videos = [...existing.videos.filter((v) => v.id !== only), ...manifest.videos].sort((a, b) => SCENES.findIndex((s) => s.id === a.id) - SCENES.findIndex((s) => s.id === b.id));
    fs.writeFileSync(MANIFEST, JSON.stringify(existing, null, 2) + "\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
