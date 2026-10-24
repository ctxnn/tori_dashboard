import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { createAsset } from "@/lib/domain/kits";
import { badRequest } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const user = await requireApiUser("owner");
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  if (!form) throw badRequest("Send the artwork as a form upload");
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Choose an image file to upload");
  const asset = createAsset({
    kitId: id,
    name: String(form.get("name") ?? ""),
    description: String(form.get("description") ?? ""),
    data: Buffer.from(await file.arrayBuffer()),
    actor: user,
  });
  return { asset: { id: asset.id, code: asset.code, name: asset.name } };
});
