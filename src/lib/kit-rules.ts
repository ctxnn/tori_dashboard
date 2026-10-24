// Owner-declared rules for a kit version. Client-safe so the kit editor can share it.
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const KitProductRuleSchema = z.object({
  productId: z.string().min(1),
  layouts: z.array(z.string()).min(1, "Allow at least one layout"),
  minPriceMinor: z.number().int().min(0),
  maxPriceMinor: z.number().int().min(0),
});

export const KitRulesSchema = z
  .object({
    products: z.array(KitProductRuleSchema).min(1, "Permit at least one product"),
    territories: z.array(z.string().length(2)).min(1, "Permit at least one territory"),
    window: z.object({ start: isoDate, end: isoDate }),
    requiredApproverId: z.string().min(1, "Name the person who must approve"),
    artworkScale: z.object({ min: z.number().min(0.4).max(1.2), max: z.number().min(0.4).max(1.2) }),
    prohibitedTerms: z.array(z.string().trim().min(1)).max(50),
    royaltyBps: z.number().int().min(0).max(5000),
  })
  .superRefine((r, ctx) => {
    if (r.window.end <= r.window.start) ctx.addIssue({ code: "custom", path: ["window", "end"], message: "End date must be after the start date" });
    if (r.artworkScale.max < r.artworkScale.min) ctx.addIssue({ code: "custom", path: ["artworkScale"], message: "Maximum scale must be at least the minimum" });
    r.products.forEach((p, i) => {
      if (p.maxPriceMinor < p.minPriceMinor) ctx.addIssue({ code: "custom", path: ["products", i, "maxPriceMinor"], message: "Maximum price must be at least the minimum" });
    });
  });

export type KitRules = z.infer<typeof KitRulesSchema>;
