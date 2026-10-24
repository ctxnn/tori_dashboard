"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  // The most specific matching link is the active one.
  const activeHref = links
    .filter((l) => path === l.href || path.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label="Main" className="-mx-1 flex h-full min-w-0 items-stretch gap-1 overflow-x-auto px-1 [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,black_80%,transparent)] max-sm:pr-6">
      {links.map((l) => {
        const active = l.href === activeHref;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "relative flex items-center whitespace-nowrap px-2.5 text-[13.5px] transition-colors",
              active ? "font-medium text-ink group-data-[tone=dark]/header:text-paper" : "text-moss hover:text-ink group-data-[tone=dark]/header:text-paper/55 group-data-[tone=dark]/header:hover:text-paper",
            )}
          >
            {l.label}
            <span className={cx("absolute inset-x-2.5 -bottom-px h-[2px] rounded-full transition-colors", active ? "bg-vermilion" : "bg-transparent")} aria-hidden />
          </Link>
        );
      })}
    </nav>
  );
}
