import fs from "node:fs";
import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { assetPath, getAsset } from "@/lib/domain/kits";
import { notFound } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

// Original kit artwork is only served to signed-in collaborators (not fans).
// Fans only ever see the rendered campaign preview.
export const GET = route(async (_req, { params }: Ctx) => {
  await requireApiUser("owner", "creator", "operator");
  const { id } = await params;
  const a = getAsset(id);
  if (!a) throw notFound("Asset");
  const data = fs.readFileSync(assetPath(a));
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": a.mime,
      "cache-control": "private, max-age=3600",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
});
