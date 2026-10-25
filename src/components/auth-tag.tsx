// The authenticity hang tag: what ships on every unit. Server component.
import Link from "next/link";
import { qrSvg, verifyUrl } from "@/lib/qr";
import { cx } from "./ui";
import { Hanko } from "./japan";

export async function AuthTag({ code, serialNo, runSize, title, property, className }: { code: string; serialNo: number; runSize: number; title: string; property: string; className?: string }) {
  const url = await verifyUrl(code);
  const svg = await qrSvg(url);
  return (
    <div className={cx("relative w-full max-w-[260px] overflow-hidden rounded-[14px] border border-sand-2 bg-[#f7f2e7] px-5 pb-5 pt-9 text-ink shadow-[0_18px_36px_-24px_rgba(14,19,17,0.45)]", className)}>
      <div className="washi pointer-events-none absolute inset-0" aria-hidden />
      <span className="absolute left-1/2 top-3 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-sand-2 bg-paper shadow-inner" aria-hidden />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="label text-[9px] text-moss">Official · {property}</div>
            <div className="mt-1 truncate text-[14px] font-semibold tracking-[-0.02em]">{title}</div>
          </div>
          <Hanko lines={["本物", "GENUINE"]} className="h-11 w-11 shrink-0" />
        </div>
        <Link href={`/verify/${encodeURIComponent(code)}`} className="mt-4 block rounded-md bg-white p-3" aria-label={`Verify tag ${code}`}>
          <span className="block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        </Link>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className="label text-[9px] text-moss">Tag</div>
            <div className="font-mono text-[13px] font-semibold tracking-[0.04em]">{code}</div>
          </div>
          <div className="text-right">
            <div className="label text-[9px] text-moss">No.</div>
            <div className="font-mono text-[13px]">
              {String(serialNo).padStart(3, "0")}<span className="text-moss">/{runSize}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 border-t border-dashed border-sand-2 pt-2 text-[10.5px] leading-snug text-moss">Scan or visit torii/verify to check it’s licensed.</p>
      </div>
    </div>
  );
}
