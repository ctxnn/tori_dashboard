"use client";

import { useRef, useState } from "react";

/** A macOS window holding a film, with heyclicky's frosted "play video" pill until it starts. */
export function VideoWindow({ src, poster, title, caption }: { src: string; poster: string; title: string; caption?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="mx-auto w-full max-w-[680px]">
      <div className="win">
        <div className="win-bar">
          <i />
          <i />
          <i />
          <span>{title}</span>
        </div>
        <div className="relative aspect-video bg-black">
          <video
            ref={ref}
            src={src}
            poster={poster}
            preload="none"
            playsInline
            controls={playing}
            onPause={() => ref.current?.ended && setPlaying(false)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {!playing && (
            <button
              type="button"
              onClick={() => {
                setPlaying(true);
                void ref.current?.play();
              }}
              className="group absolute inset-0 grid place-items-center bg-black/10 transition-colors hover:bg-black/0"
              aria-label={`Play ${title}`}
            >
              <span className="flex items-center gap-2.5 rounded-full border border-white/40 bg-white/25 px-6 py-3 text-[18px] font-medium tracking-[-0.03em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition-transform group-hover:scale-[1.03]">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M4 2.5v11l9.5-5.5z" />
                </svg>
                play video
              </span>
            </button>
          )}
        </div>
      </div>
      {caption && <figcaption className="mt-3 text-center text-[13px] tracking-[-0.01em] text-black/45">{caption}</figcaption>}
    </figure>
  );
}
