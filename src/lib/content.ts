// Shape of a campaign proposal. Client-safe so the editor and server share it.
import { z } from "zod";
import { PRODUCT_IDS } from "./catalog";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const DesignSchema = z.object({
  artworkAssetId: z.string().min(1, "Choose an approved artwork"),
  artworkScale: z.number().min(0.4).max(1.2),
  baseColour: z.string().min(1),
  text: z.object({
    line1: z.string().max(28, "Keep line 1 to 28 characters"),
    line2: z.string().max(40, "Keep line 2 to 40 characters"),
    font: z.enum(["display", "sans"]),
    colour: z.string().min(1),
    position: z.enum(["above", "below"]),
  }),
});

export const CopySchema = z.object({
  title: z.string().trim().min(4, "Give the campaign a title").max(80),
  tagline: z.string().trim().max(120),
  story: z.string().trim().max(900),
  audience: z.string().trim().max(400),
  localAngle: z.string().trim().max(400),
});

export const DistributionSchema = z.object({
  channels: z
    .array(z.object({ id: z.string(), plannedReach: z.number().int().min(0).max(10_000_000) }))
    .max(6),
  launchMoment: z.string().trim().max(200),
  creatorCommitment: z.string().trim().max(400),
});

export const OfferSchema = z.object({
  priceMinor: z.number().int().min(100).max(10_000_000),
  shippingMinor: z.number().int().min(0).max(100_000),
  thresholdUnits: z.number().int().min(1).max(5000),
  launchDate: isoDate,
  deadline: isoDate,
  territory: z.string().length(2),
  sizes: z.array(z.string()).min(1),
  expectedUnits: z.number().int().min(0).max(100_000),
});

export const TermsSchema = z.object({
  royaltyBps: z.number().int().min(0).max(10000),
  creatorBps: z.number().int().min(0).max(10000),
  platformBps: z.number().int().min(0).max(10000),
});

/** What the creator may send. Terms are set by the server, never the client. */
export const ContentInputSchema = z.object({
  productId: z.enum(PRODUCT_IDS as [string, ...string[]], { error: "Unknown product template" }),
  layoutId: z.string().min(1),
  design: DesignSchema,
  copy: CopySchema,
  distribution: DistributionSchema,
  offer: OfferSchema,
});

export const ContentSchema = ContentInputSchema.extend({ terms: TermsSchema });

export type ContentInput = z.infer<typeof ContentInputSchema>;
export type Content = z.infer<typeof ContentSchema>;
export type Design = z.infer<typeof DesignSchema>;

/** Human labels for diffing two versions. Order here is the order shown to reviewers. */
export const FIELD_LABELS: [string, string][] = [
  ["productId", "Product"],
  ["layoutId", "Layout"],
  ["design.artworkAssetId", "Artwork"],
  ["design.artworkScale", "Artwork scale"],
  ["design.baseColour", "Base colour"],
  ["design.text.line1", "Print text — line 1"],
  ["design.text.line2", "Print text — line 2"],
  ["design.text.font", "Print typeface"],
  ["design.text.colour", "Print text colour"],
  ["design.text.position", "Text position"],
  ["copy.title", "Campaign title"],
  ["copy.tagline", "Tagline"],
  ["copy.story", "Campaign story"],
  ["copy.audience", "Audience"],
  ["copy.localAngle", "Local angle"],
  ["distribution.channels", "Distribution channels"],
  ["distribution.launchMoment", "Launch moment"],
  ["distribution.creatorCommitment", "Creator commitment"],
  ["offer.priceMinor", "Item price"],
  ["offer.shippingMinor", "Shipping"],
  ["offer.thresholdUnits", "Production threshold"],
  ["offer.launchDate", "Launch date"],
  ["offer.deadline", "Preorder deadline"],
  ["offer.territory", "Territory"],
  ["offer.sizes", "Sizes"],
  ["offer.expectedUnits", "Creator's demand estimate"],
  ["terms.royaltyBps", "Licensor royalty"],
  ["terms.creatorBps", "Creator earnings"],
  ["terms.platformBps", "Torii commission"],
  ["kitVersion", "Kit version"],
];

export function getPath(obj: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], obj);
}
