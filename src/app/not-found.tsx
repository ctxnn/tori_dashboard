import { LinkButton, ToriiMark } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid-paper flex min-h-[60vh] flex-col items-center justify-center rounded-[var(--radius-card)] border border-sand px-6 text-center">
      <ToriiMark className="h-12 w-12 text-vermilion" />
      <div className="label mt-6 text-moss">404 · No gate here</div>
      <h1 className="mt-3 text-[34px] font-semibold leading-tight sm:text-[44px]">This page doesn’t exist.</h1>
      <p className="mt-3 max-w-md text-ink-2">The link may be old, or the campaign may not be published yet.</p>
      <div className="mt-6 flex gap-2">
        <LinkButton href="/">Back to Torii</LinkButton>
        <LinkButton href="/campaigns" variant="secondary">See campaigns</LinkButton>
      </div>
    </div>
  );
}
