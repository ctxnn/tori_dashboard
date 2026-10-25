import { route } from "@/lib/api";
import { recordScan } from "@/lib/domain/authenticity";

type Ctx = { params: Promise<{ code: string }> };

// Public: logs one lookup of a tag (found or not).
export const POST = route(async (_req, { params }: Ctx) => {
  const { code } = await params;
  return recordScan(decodeURIComponent(code));
});
