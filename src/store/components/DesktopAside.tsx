import { headers } from "next/headers";
import QRCode from "qrcode";
import { Torii } from "./Icons";

/** On a computer, Torii sits in a phone-width column; this panel invites people to open it on their phone. */
export default async function DesktopAside() {
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/read`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#181522", light: "#ffffff" } });
  return (
    <aside aria-label="Open on your phone" className="pointer-events-none fixed inset-y-0 left-0 hidden w-[calc(50%-220px)] items-center justify-center p-10 text-white min-[1080px]:flex">
      <div className="pointer-events-auto max-w-[300px]">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgb(222,0,52)]"><Torii className="h-7 w-7" /></span>
        <h2 className="mt-5 font-display text-[34px] leading-[1.02]">Made for your phone.</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/70">Torii is a phone app. Scan this with your phone camera to open it there, or keep using it here.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`QR code for ${url}`} className="mt-6 w-40 rounded-xl bg-white p-2" />
        <p className="mt-2 text-[12.5px] text-white/50">{url.replace(/^https?:\/\//, "")}</p>
      </div>
    </aside>
  );
}
