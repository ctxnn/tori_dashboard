import { getBlob, blobResponse } from "@/store/lib/blobs";
import { currentPartner } from "@/store/lib/partner-auth";
import { currentUser } from "@/store/lib/auth";

/**
 * Uploaded images. Covers and banners are public (they appear across the store). Manga pages are only
 * served here to the publisher that uploaded them and to Torii staff, for previews and review;
 * readers get pages through /api/store/page, which checks that the chapter is out and unlocked.
 */
export async function GET(_: Request, { params: paramsIn }: { params: Promise<{ id: string }> }) { const params = await paramsIn;
  const b = await getBlob(params.id);
  if (!b) return new Response("Not found", { status: 404 });
  if (b.meta.kind !== "page") return blobResponse(b, "public, max-age=31536000, immutable");
  const [partner, user] = await Promise.all([currentPartner(), currentUser()]);
  if (partner?.org.id === b.meta.orgId || user?.isAdmin) return blobResponse(b, "private, max-age=3600");
  return new Response("Not found", { status: 404 });
}
