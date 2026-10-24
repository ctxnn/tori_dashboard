// Injected into every page while recording demo videos: a visible cursor with
// click ripples, a caption bar, and full-screen title cards. Lives outside <body>
// so React never touches it. Caption text survives navigations via sessionStorage.
(() => {
  if (window.__rec) return;
  const css = `
  #rec-root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:var(--font-geist),ui-sans-serif,system-ui,sans-serif}
  #rec-cursor{position:fixed;left:0;top:0;width:28px;height:28px;transform:translate(-4px,-3px);filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));transition:opacity .2s}
  .rec-ripple{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #e2402a;animation:recrip .6s ease-out forwards}
  @keyframes recrip{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}
  #rec-ring{position:fixed;border:2px solid #e2402a;border-radius:10px;box-shadow:0 0 0 6px rgba(226,64,42,.15);opacity:0;transition:all .25s ease}
  #rec-cap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(12px);max-width:1040px;width:calc(100% - 96px);display:flex;align-items:center;gap:18px;background:rgba(14,19,17,.94);color:#f5f4ef;border-radius:14px;padding:16px 22px;box-shadow:0 20px 50px -20px rgba(0,0,0,.6);opacity:0;transition:opacity .35s,transform .35s}
  #rec-cap.on{opacity:1;transform:translateX(-50%) translateY(0)}
  #rec-cap .role{display:flex;align-items:center;gap:8px;white-space:nowrap;font:500 12px/1 var(--font-geist-mono),ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(245,244,239,.7);padding-right:18px;border-right:1px solid rgba(245,244,239,.15)}
  #rec-cap .dot{width:9px;height:9px;border-radius:50%;background:#e2402a}
  #rec-cap .num{font:500 13px/1 var(--font-geist-mono),ui-monospace,monospace;color:#e2402a;white-space:nowrap}
  #rec-cap .txt{font-size:21px;line-height:1.3;font-weight:500;letter-spacing:-.01em}
  #rec-card{position:fixed;inset:0;background:#0e1311;color:#f5f4ef;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;transition:opacity .6s;background-image:linear-gradient(to right,rgba(245,244,239,.06) 1px,transparent 1px),linear-gradient(to bottom,rgba(245,244,239,.06) 1px,transparent 1px);background-size:32px 32px}
  #rec-card.on{opacity:1}
  #rec-card .k{width:120px;height:120px;color:#e2402a}
  #rec-card .k svg{width:100%;height:100%}
  #rec-card .n{margin-top:22px;font-family:"Hiragino Mincho ProN","Yu Mincho",serif;font-size:30px;color:rgba(245,244,239,.85)}
  #rec-card .eyebrow{margin-top:28px;font:500 14px/1 var(--font-geist-mono),ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,244,239,.55)}
  #rec-card .t{margin-top:16px;font-size:64px;font-weight:600;letter-spacing:-.04em;line-height:1}
  #rec-card .s{margin-top:18px;font-size:22px;color:rgba(245,244,239,.7);max-width:820px;line-height:1.4}
  `;
  const CURSOR = `<svg id="rec-cursor" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.4L16.5 21l-3 1.5-4-8.2L4 19z" fill="#0e1311" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

  function mount() {
    if (document.getElementById("rec-root")) return;
    const style = document.createElement("style");
    style.textContent = css;
    const root = document.createElement("div");
    root.id = "rec-root";
    root.innerHTML = `${CURSOR}<div id="rec-ring"></div><div id="rec-cap"><span class="role"><span class="dot"></span><span class="rname"></span></span><span class="num"></span><span class="txt"></span></div><div id="rec-card"></div>`;
    document.documentElement.appendChild(style);
    document.documentElement.appendChild(root);
    const pos = JSON.parse(sessionStorage.getItem("rec-pos") || "[720,420]");
    move(pos[0], pos[1]);
  }

  function move(x, y) {
    const c = document.getElementById("rec-cursor");
    if (c) {
      c.style.left = `${x}px`;
      c.style.top = `${y}px`;
    }
    sessionStorage.setItem("rec-pos", JSON.stringify([x, y]));
  }

  function caption(text, num, role, color, instant) {
    const el = document.getElementById("rec-cap");
    if (!el) return;
    if (!text) {
      el.classList.remove("on");
      return;
    }
    const set = () => {
      el.querySelector(".txt").textContent = text;
      el.querySelector(".num").textContent = num || "";
      el.querySelector(".rname").textContent = role || "";
      el.querySelector(".dot").style.background = color || "#e2402a";
      el.classList.add("on");
    };
    if (instant || !el.classList.contains("on")) set();
    else {
      el.classList.remove("on");
      setTimeout(set, 220);
    }
  }

  function card(html) {
    const el = document.getElementById("rec-card");
    if (!el) return;
    if (!html) {
      el.classList.remove("on");
      setTimeout(() => { if (!el.classList.contains("on")) el.innerHTML = ""; }, 700);
      const c = document.getElementById("rec-cursor");
      if (c) c.style.opacity = "1";
      return;
    }
    el.innerHTML = html;
    el.classList.add("on");
    const c = document.getElementById("rec-cursor");
    if (c) c.style.opacity = "0";
  }

  function ring(r) {
    const el = document.getElementById("rec-ring");
    if (!el) return;
    if (!r) {
      el.style.opacity = "0";
      return;
    }
    Object.assign(el.style, { left: `${r.x - 6}px`, top: `${r.y - 6}px`, width: `${r.w + 12}px`, height: `${r.h + 12}px`, opacity: "1" });
  }

  window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY), true);
  window.addEventListener(
    "mousedown",
    (e) => {
      const r = document.createElement("div");
      r.className = "rec-ripple";
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      document.getElementById("rec-root")?.appendChild(r);
      setTimeout(() => r.remove(), 700);
    },
    true,
  );

  window.__rec = { caption, card, ring, move };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
  // Re-mount if anything removes it.
  new MutationObserver(() => mount()).observe(document.documentElement, { childList: true });
})();
