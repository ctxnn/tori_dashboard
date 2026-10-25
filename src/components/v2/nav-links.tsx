"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

/** Header links as soft pills; the current page sits on a raised white chip. */
export function V2NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  const activeHref = links
    .filter((l) => path === l.href || path.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label="Main" className="-mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto px-1 py-1 [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,black_80%,transparent)] max-sm:pr-6">
      {links.map((l) => {
        const active = l.href === activeHref;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-[14px] tracking-[-0.02em] transition-[color,background-color,box-shadow]",
              active ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08),0_3px_10px_rgba(0,0,0,0.06)]" : "text-black/55 hover:text-ink",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
