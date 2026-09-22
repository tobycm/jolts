"use client";

import { useEffect, useRef, useState } from "react";

import { LOGO_CHAR_PATHS } from "@/components/entry-logo-chars";

const PIXEL = 14; // block size in CSS px — constant, never scales with the circle
// chars wave from 180ms to ~1020ms (see entry-char-pop); iris opens while
// the characters are still popping
const HOLD_MS = 400;
const DURATION_MS = 900;

const easeInOutQuint = (t: number) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

// Full-screen black cover: the centered logo characters pulse in a stagger,
// then a pixelated center hole grows to reveal the page while the logo fades.
// The canvas is transparent until JS runs; its CSS background keeps the first
// paint black so content never flashes.
export function EntryReveal() {
  const [done, setDone] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    // internal navigation — the overlay is already display:none via CSS
    if (document.documentElement.hasAttribute("data-entry-skip")) {
      setDone(true);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wrapper.style.transition = "opacity 400ms ease-out";
      wrapper.style.opacity = "0";
      const t = setTimeout(() => setDone(true), 450);
      return () => clearTimeout(t);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setDone(true);
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    // a zero-size viewport (a hidden/detached frame at mount) would make cols
    // or rows 0, and createImageData(0, …) throws - just skip the animation
    if (w <= 0 || h <= 0) {
      setDone(true);
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    // reach the farthest corner so the last blocks clear the screen
    const maxR = Math.hypot(cx, cy) + PIXEL;
    const cols = Math.ceil(w / PIXEL);
    const rows = Math.ceil(h / PIXEL);

    // one offscreen pixel per block, upscaled with smoothing off — keeps the
    // per-frame cost tiny no matter how small PIXEL gets
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const octx = off.getContext("2d");
    if (!octx) {
      setDone(true);
      return;
    }
    const img = octx.createImageData(cols, rows);
    const dist2 = new Float64Array(cols * rows);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const dx = (i + 0.5) * PIXEL - cx;
        const dy = (j + 0.5) * PIXEL - cy;
        dist2[j * cols + i] = dx * dx + dy * dy;
      }
    }

    let raf = 0;
    let start: number | null = null;

    const draw = (r: number) => {
      const r2 = r * r;
      for (let n = 0; n < dist2.length; n++) {
        img.data[n * 4 + 3] = dist2[n] > r2 ? 255 : 0;
      }
      octx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, cols * PIXEL, rows * PIXEL);
    };

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, Math.max(0, (now - start - HOLD_MS) / DURATION_MS));
      draw(easeInOutQuint(t) * maxR);
      // canvas now owns the black; drop the CSS backstop
      canvas.style.background = "transparent";
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };

    draw(0);
    // unpause the character pulses in the same frame the iris clock starts,
    // so the two timelines can't drift apart on slow hydration
    wrapper.classList.add("entry-play");
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (done) return null;

  return (
    <div ref={wrapperRef} aria-hidden className="entry-reveal">
      {/* without hydration nothing ever starts the reveal, so the overlay
          would sit there black over the page forever */}
      <noscript>
        <style>{`.entry-reveal{display:none}`}</style>
      </noscript>
      <canvas ref={canvasRef} className="entry-reveal-canvas" />
      {/* the halo layer paints every character's white outline first, then the
          face layer paints the artwork over it, so the halos that fall inside
          the group's silhouette are covered and only the union outline is
          left — see entry-logo-halo in globals.css for why the outline can't
          just live on the container */}
      <div className="entry-logo">
        <LogoChars className="entry-logo-halo" />
        <LogoChars className="entry-logo-face" />
      </div>
    </div>
  );
}

// every character shares the full 283x148 logo canvas, so stacking them
// reconstructs the logo; inlined so no image fetches happen
function LogoChars({ className }: { className: string }) {
  return (
    <div className={className}>
      {LOGO_CHAR_PATHS.map((Char, i) => (
        <svg
          key={i}
          viewBox="0 0 283 148"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ "--char-i": i } as React.CSSProperties}
        >
          <Char />
        </svg>
      ))}
    </div>
  );
}
