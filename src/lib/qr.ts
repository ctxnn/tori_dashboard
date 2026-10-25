// QR codes for authenticity tags, rendered on the server as inline SVG.
import QRCode from "qrcode";
import { headers } from "next/headers";

export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0e1311", light: "#0000" } });
}

/** The public origin this request came in on (works behind a tunnel or proxy). */
export async function publicOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function verifyUrl(code: string): Promise<string> {
  return `${await publicOrigin()}/verify/${encodeURIComponent(code)}`;
}
