"use client"

import { useEffect, useRef, useState } from "react"

import Link from "next/link"
import { createPortal } from "react-dom"

/* Wikipedia-style hover preview on cross-link chips. The preview content is
   baked into the HTML at build time (no fetch, no loading state) - this
   component only owns hover timing, positioning, and the corner cutout.

   The chip is the link; the pane wears the navigation dropdown's chrome:
   a rounded checker frame in the content type's family around a white
   surface. The kind label sits in a flag-shaped notch cut out of the
   surface's top-right corner (the "Zero To One" tab shape), sized to the
   label text. The pane renders in a portal with fixed positioning so it
   can never be clipped by masked or overflow-hidden ancestors (chips live
   inside Warning/Checkpoint frames, whose surfaces are mask-clipped).
   Opens after a short dwell, also opens on keyboard focus, and flips
   above the chip when the viewport below is tight. */

export type PreviewTheme = {
  /** bright: the "Read more" link */
  accent: string
  /** the pane's frame chrome (deepened in dark) */
  frame: string
  checkerA: string
  checkerB: string
  /** rgb triplet for the wash gradient, e.g. "222,141,255" */
  wash: string
  /** chip colors */
  chipBg: string
  chipText: string
  chipHoverBg: string
}

/* Pane geometry (px). The surface width is fixed, which lets the notch be
   an exact-scale SVG mask instead of a stretched one. */
const PANE_W = 300
const FRAME = 5
const SURFACE_W = PANE_W - FRAME * 2 // 290
const NOTCH_H = 28

/* One SVG mask layer: the full top strip with the flag-shaped notch cut
   out of its right end (evenodd). Curves are authored at render scale so
   the corners stay as round as the original tab; outer notch edges bleed
   past the viewBox so anti-aliasing can't leave slivers. The strip is one
   pixel taller than the notch and the second mask layer starts one pixel
   early, so the two layers overlap on a fully-opaque row - no hairline
   gap at fractional zoom levels. */
function notchStripSvg(notchW: number): string {
  const x0 = SURFACE_W - notchW
  const p = (n: number) => Math.round(n * 100) / 100
  const path =
    `M${p(x0 + 12.4)} 21.8L${p(x0 + 6.6)} 6.2` +
    `C${p(x0 + 5.3)} 2.4 ${p(x0 + 3)} -1 ${p(x0)} -1` +
    `H285.5C288.5 -1 291 1.5 291 5V28H${p(x0 + 22.3)}` +
    `C${p(x0 + 17.3)} 28 ${p(x0 + 14.2)} 25.5 ${p(x0 + 12.4)} 21.8Z`
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${SURFACE_W} ${NOTCH_H + 1}'>` +
    `<path fill-rule='evenodd' d='M0 0H${SURFACE_W}V${NOTCH_H + 1}H0Z ${path}' fill='#000'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

type PanePos = {
  left: number
  top?: number
  bottom?: number
  above: boolean
}

export function PreviewLink({
  href,
  theme,
  icon,
  kindLabel,
  title,
  excerpt,
  meta,
  children,
}: {
  href: string
  theme: PreviewTheme
  icon?: React.ReactNode
  /** e.g. "Concept" or "Tool" */
  kindLabel: string
  title: string
  excerpt: string
  meta?: string
  children: React.ReactNode
}) {
  const [pos, setPos] = useState<PanePos | null>(null)
  const [notchW, setNotchW] = useState(96)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      const above = window.innerHeight - rect.bottom < 260
      // notch = tilt zone + label text + right padding
      const labelW = measureRef.current?.offsetWidth ?? 56
      setNotchW(Math.min(SURFACE_W - 80, labelW + 40))
      setPos({
        left: Math.max(
          8,
          Math.min(rect.left - 6, window.innerWidth - PANE_W - 8)
        ),
        above,
        ...(above
          ? { bottom: window.innerHeight - rect.top + 8 }
          : { top: rect.bottom + 8 }),
      })
    }, 200)
  }
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPos(null), 120)
  }

  // fixed positioning goes stale the moment the page scrolls - just close
  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    window.addEventListener("scroll", close, { passive: true, capture: true })
    return () =>
      window.removeEventListener("scroll", close, { capture: true })
  }, [pos])

  const maskImage = `${notchStripSvg(notchW)}, linear-gradient(#000, #000)`
  const maskPosition = `top left, 0 ${NOTCH_H}px`
  const maskSize = `100% ${NOTCH_H + 1}px, 100% calc(100% - ${NOTCH_H}px)`
  const maskRepeat = "no-repeat, no-repeat"

  return (
    <span
      ref={anchorRef}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {/* invisible measurer for the label text, same type styles as the flag */}
      <span
        ref={measureRef}
        aria-hidden
        className="invisible absolute top-0 left-0 text-[13.5px] font-semibold tracking-[-0.02em] whitespace-nowrap"
      >
        {kindLabel}
      </span>

      <Link
        href={href}
        onFocus={show}
        onBlur={hide}
        className="mx-[1px] inline-flex translate-y-[2px] items-center gap-[4px] rounded-[6px] px-[7px] py-[1.5px] text-[0.94em] font-semibold tracking-[-0.02em] no-underline transition-colors duration-150"
        style={{ background: theme.chipBg, color: theme.chipText }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = theme.chipHoverBg
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = theme.chipBg
        }}
      >
        {icon}
        {children}
      </Link>

      {pos &&
        createPortal(
          <span
            role="tooltip"
            className="fixed z-50 block overflow-hidden rounded-[12px] p-[5px] shadow-[0px_6px_22px_-4px_rgba(0,0,0,0.28)] animate-in fade-in zoom-in-95 duration-100 ease-out"
            style={{
              background: theme.frame,
              width: PANE_W,
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              // grow out of the corner nearest the chip
              transformOrigin: pos.above ? "bottom left" : "top left",
            }}
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {/* the navigation pane's chrome: rotated checker + deepening wash */}
            <span
              aria-hidden
              className="absolute -inset-[60%] block rotate-[-16.06deg]"
              style={{
                backgroundImage: `conic-gradient(${theme.checkerA} 0 25%, ${theme.checkerB} 0 50%, ${theme.checkerA} 0 75%, ${theme.checkerB} 0)`,
                backgroundSize: "120px 120px",
              }}
            />
            <span
              aria-hidden
              className="absolute inset-0 block"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(${theme.wash},0) 0%, rgba(${theme.wash},0.7) 100%)`,
              }}
            />

            {/* kind label - sits on the frame, inside the surface cutout */}
            <span className="pointer-events-none absolute top-[5px] right-[5px] z-10 flex h-[28px] items-center pr-[15px] text-[13.5px] font-semibold tracking-[-0.02em] text-white">
              {kindLabel}
            </span>

            <Link
              href={href}
              tabIndex={-1}
              className="relative block rounded-[8px] bg-[var(--jt-surface)] p-[13px] no-underline shadow-[0px_3px_5px_0px_rgba(0,0,0,0.2)]"
              style={{
                WebkitMaskImage: maskImage,
                WebkitMaskPosition: maskPosition,
                WebkitMaskSize: maskSize,
                WebkitMaskRepeat: maskRepeat,
                maskImage,
                maskPosition,
                maskSize,
                maskRepeat,
              }}
            >
              <span
                className="block text-[15px] font-semibold tracking-[-0.02em] text-[var(--jt-ink)]"
                style={{ paddingRight: notchW - 4 }}
              >
                {title}
              </span>
              <span className="mt-[5px] block text-[13px] leading-[1.55] tracking-[-0.01em] text-[var(--jt-muted)]">
                {excerpt}
              </span>
              {meta && (
                <span className="mt-[7px] block text-[12px] tracking-[-0.01em] text-[var(--jt-faint)]">
                  {meta}
                </span>
              )}
              <span
                className="mt-[9px] block text-right text-[12.5px] font-semibold tracking-[-0.01em]"
                style={{ color: theme.accent }}
              >
                Read more →
              </span>
            </Link>
          </span>,
          document.body
        )}
    </span>
  )
}
