import { fail, ok } from "@/store/lib/api";
import { partnerOr401 } from "@/store/lib/partner-api";
import { putBlob, sniffImage, type BlobKind } from "@/store/lib/blobs";
import { mediaUrl } from "@/store/lib/partner";
import { UPLOAD } from "@/store/lib/config";

/** One image per request (cover, banner or manga page). The browser resizes pages before sending them. */
export async function POST(req: Request) {
  const p = await partnerOr401(); if (p instanceof Response) return p;
  let form: FormData;
  try { form = await req.formData(); } catch { return fail("Send the image as form data"); }
  const kind = String(form.get("kind")) as BlobKind;
  if (!["cover", "banner", "page"].includes(kind)) return fail("Unknown upload type");
  const file = form.get("file");
  if (!(file instanceof Blob)) return fail("No file received");
  if (file.size > UPLOAD.maxBytes) return fail(`Images must be under ${UPLOAD.maxBytes / 1024 / 1024} MB`, 413);
  const data = Buffer.from(await file.arrayBuffer());
  const ct = sniffImage(data);
  if (!ct) return fail("Upload a JPEG, PNG or WebP image", 415);
  const id = await putBlob(data, { kind, orgId: p.org.id, ct });
  return ok({ id, url: mediaUrl(id), size: data.length });
}
