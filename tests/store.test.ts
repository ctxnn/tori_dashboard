import { beforeEach, describe, expect, test } from "vitest";
import { freshDemo } from "./helpers";
import { mutate, read } from "../src/store/lib/db";
import { collabOrdersFor, listCollabs, merchForOwner } from "../src/store/lib/collabs";
import { buildProof } from "../src/lib/domain/proof";
import { sampleCode } from "../src/lib/domain/authenticity";
import { resetDemo } from "../src/lib/seed";
import { POST as verify } from "../src/app/api/store/verify/route";

const check = async (code: string) =>
  (await verify(new Request("http://torii.test/api/store/verify", { method: "POST", body: JSON.stringify({ code }) }))).json();

describe("Fan store and Partner Portal", () => {
  beforeEach(async () => {
    await freshDemo();
  });

  test("store state lives in the demo database and resets with it", async () => {
    const before = await read();
    expect(before.users.find((u) => u.id === "u_aarav")?.wallet).toBe(50);
    await mutate((db) => {
      db.users.find((u) => u.id === "u_aarav")!.wallet = 500;
    });
    expect((await read()).users.find((u) => u.id === "u_aarav")?.wallet).toBe(500);
    await resetDemo();
    expect((await read()).users.find((u) => u.id === "u_aarav")?.wallet).toBe(50);
  });

  test("demo people are the same person in the workspace, the fan app and the portal", async () => {
    const db = await read();
    expect(db.users.find((u) => u.studioId === "usr_aarav")?.phone).toBe("9876543210");
    expect(db.users.find((u) => u.studioId === "usr_meera")?.isAdmin).toBe(true);
    const kumo = db.partnerUsers.find((u) => u.studioIds?.includes("usr_haruka"));
    expect(db.partners.find((o) => o.id === kumo?.orgId)?.name).toBe("Kumo Lantern Studio");
    const sky = db.series.find((s) => s.slug === "sky-courier");
    expect(sky?.demoProperty).toBe(true);
    expect(db.publishers.find((p) => p.id === sky?.publisherId)?.name).toBe("Kumo Lantern Studio");
  });

  test("collabs reach the fan app, the fan's shelf and the publisher's console", async () => {
    const all = listCollabs();
    expect(all.length).toBeGreaterThan(0);
    expect(listCollabs({ property: "Sky Courier" })).toHaveLength(all.length);
    expect(listCollabs({ property: "One Piece" })).toHaveLength(0);
    expect(all.filter((c) => c.open).every((c) => c.daysLeft >= 0)).toBe(true);

    const shelf = collabOrdersFor("usr_aarav");
    expect(shelf.length).toBeGreaterThan(0);
    expect(shelf.every((o) => o.status !== "Awaiting payment")).toBe(true);
    expect(collabOrdersFor(undefined)).toEqual([]);

    const merch = merchForOwner("Kumo Lantern Studio");
    expect(merch.kits.map((k) => k.property)).toEqual(["Sky Courier"]);
    // The portal reads the same ledger as the proof dashboard.
    expect(merch.royaltyMinor).toBe(buildProof().money.totals.licensor);
    expect(merch.unitsBacked).toBe(all.reduce((n, c) => n + c.paidUnits, 0));
    expect(merchForOwner("Shueisha").kits).toEqual([]);
  });

  test("one verifier for store tags and collab tags", async () => {
    const collab = sampleCode()!;
    expect(await check(collab)).toMatchObject({ state: "collab", code: collab, title: "First Flight Tee", href: `/verify/${collab}` });
    // A scanned QR holds the full verify link.
    expect(await check(`https://torii.example/verify/${collab}`)).toMatchObject({ state: "collab", code: collab });
    expect(await check("T1-FAKE7777-ABCDEFGH")).toMatchObject({ state: "invalid" });
    expect(await check("SC-0000-0000")).toMatchObject({ state: "invalid" });
  });
});
