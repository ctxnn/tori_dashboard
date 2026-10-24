import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Arrow, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { VideoTour, type TourVideo } from "./video-tour";

export const metadata = {
  title: "How it works",
  description: "Video walkthroughs of Torii for each login: IP owner, creator, fan and operator.",
};

interface Manifest {
  recordedAt?: string;
  size?: { width: number; height: number };
  videos: TourVideo[];
  full?: { src: string; duration: number };
}

function readManifest(): Manifest | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/lib/demo-videos.json"), "utf8")) as Manifest;
  } catch {
    return null;
  }
}

const minutes = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export default function HowItWorks() {
  const m = readManifest();
  const total = m?.videos.reduce((s, v) => s + v.duration, 0) ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="How it works · video walkthroughs"
        title={<>Watch Torii, <span className="font-serif font-normal italic">one login</span> at a time.</>}
        description="Each film is a real recording of this app, driven start to finish, with captions on screen. Watch them in order to follow one collaboration from kit to statement — or pull them straight into your presentation."
        meta={
          m
            ? [
                ["Films", m.videos.length],
                ["Running time", minutes(total)],
                ["Format", `MP4 · ${m.size?.width ?? 1440}×${m.size?.height ?? 810}`],
              ]
            : undefined
        }
        actions={
          m?.full && (
            <a href={m.full.src} download className={buttonClass("primary")}>
              Download full walkthrough · {minutes(m.full.duration)}
            </a>
          )
        }
      />

      {!m || m.videos.length === 0 ? (
        <EmptyState title="Videos haven’t been recorded yet">
          Start a production server on port 3100 with a throwaway data folder, then run <code className="font-mono">npm run record:demos</code>. See the README.
        </EmptyState>
      ) : (
        <>
          <VideoTour videos={m.videos} />

          {m.full && (
            <section aria-labelledby="full" className="mt-24 grid gap-10 border-t border-ink pt-10 lg:grid-cols-[360px_1fr]">
              <div>
                <div className="label text-moss">For your presentation</div>
                <h2 id="full" className="mt-3 text-[30px] font-semibold leading-[1.05]">One continuous film.</h2>
                <p className="mt-4 text-sm leading-relaxed text-ink-2">
                  All four walkthroughs joined in story order: the owner approves, the creator publishes, a fan pays, the operator ships and reconciles. {minutes(m.full.duration)} long.
                </p>
                <ul className="mt-6 space-y-3 text-[13.5px] text-ink-2">
                  {[
                    "H.264 MP4 — drops straight into PowerPoint, Keynote or Google Slides.",
                    "Captions are burned in, so it works with the sound off. Narrate over it live.",
                    "Every film opens and closes on a title card, so cuts between them look clean.",
                  ].map((t, i) => (
                    <li key={i} className="grid grid-cols-[24px_1fr]">
                      <span className="pt-0.5 font-mono text-[13px] leading-none text-vermilion">{String(i + 1).padStart(2, "0")}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-2">
                  <a href={m.full.src} download className={buttonClass("primary")}>Download MP4</a>
                  <Link href="/" className={`group ${buttonClass("secondary")}`}>Try it yourself <Arrow /></Link>
                </div>
              </div>
              <div className="overflow-hidden rounded-[var(--radius-card)] bg-ink">
                <video src={m.full.src} poster={m.videos[0]?.poster} muted controls preload="metadata" playsInline className="block aspect-video w-full" aria-label="Full Torii walkthrough" />
              </div>
            </section>
          )}
          {m.recordedAt && (
            <p className="mt-10 font-mono text-[11px] text-moss">
              Recorded {new Date(m.recordedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} from seeded demonstration data. Re-record any time with <span className="text-ink">npm run record:demos</span>.
            </p>
          )}
        </>
      )}
    </div>
  );
}
