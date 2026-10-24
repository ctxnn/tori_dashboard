// All money is integer paise. Percentages are basis points (1% = 100 bps).

export function formatINR(minor: number, opts: { paise?: boolean } = {}): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const showPaise = opts.paise ?? abs % 100 !== 0;
  const rupees = (abs / 100).toLocaleString("en-IN", {
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  });
  return `${negative ? "−" : ""}₹${rupees}`;
}

export function rupeesToMinor(rupees: number): number {
  return Math.round(rupees * 100);
}

export function bpsToPercent(bps: number): string {
  const p = bps / 100;
  return `${Number.isInteger(p) ? p : p.toFixed(2)}%`;
}

/** Deterministic share: always rounds down to the paisa. */
export function applyBps(amountMinor: number, bps: number): number {
  if (!Number.isInteger(amountMinor) || !Number.isInteger(bps)) throw new Error("Money must be integers");
  return Math.floor((amountMinor * bps) / 10000);
}

export interface Terms {
  royaltyBps: number;
  creatorBps: number;
  platformBps: number;
}

export interface Allocation {
  netItemSales: number;
  licensorRoyalty: number;
  creatorEarnings: number;
  toriiCommission: number;
  /** Whatever is left after the three percentage shares goes to the seller. */
  sellerShare: number;
}

export function allocate(netItemSalesMinor: number, terms: Terms): Allocation {
  const licensorRoyalty = applyBps(netItemSalesMinor, terms.royaltyBps);
  const creatorEarnings = applyBps(netItemSalesMinor, terms.creatorBps);
  const toriiCommission = applyBps(netItemSalesMinor, terms.platformBps);
  return {
    netItemSales: netItemSalesMinor,
    licensorRoyalty,
    creatorEarnings,
    toriiCommission,
    sellerShare: netItemSalesMinor - licensorRoyalty - creatorEarnings - toriiCommission,
  };
}
