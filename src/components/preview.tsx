import { cx } from "./ui";

/** Renders a Torii-generated preview SVG. Text in the SVG is escaped at render time. */
export function Preview({ svg, className, label }: { svg: string; className?: string; label?: string }) {
  return <div className={cx("preview", className)} aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}
