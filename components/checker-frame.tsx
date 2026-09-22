import { cn } from "@/lib/utils"

/* The site's chrome, reusable: a rounded checker frame (rotated conic
   checkerboard + deepening wash) around white surfaces - the same family
   as the header, the nav dropdown, ShipIt, and the hover pane. All
   server-rendered, pure CSS.

   FlagFrame adds the "Zero To One" flag on the LEFT: the label sits on
   the frame inside a flag-shaped cutout of the white surface. These are
   server components, so the flag width is estimated from the label
   (13.5px semibold ≈ 7.8px/char) with padding that absorbs the error. */

export type FrameTheme = {
  /** The frame's base fill, under the checker. Deliberately NOT the
      family's `accent`: in dark mode the chrome drops to near-surface
      luminance while the accent stays bright for type and icons. */
  frame: string
  checkerA: string
  checkerB: string
  /** rgb triplet for the wash gradient */
  wash: string
}

export function CheckerFrame({
  theme,
  className,
  checkerSize = 120,
  pinned = false,
  children,
}: {
  theme: FrameTheme
  className?: string
  checkerSize?: number
  /** Pin the pattern to the frame's top edge with a fixed-size layer, so
      the checker doesn't shift when the frame's height animates. */
  pinned?: boolean
  children: React.ReactNode
}) {
  return (
    // isolate: inner z-indexed layers (flag labels etc.) must never
    // escape and paint over floating UI like the editor's menus
    <div
      className={cn("relative isolate overflow-hidden rounded-[12px] p-[5px]", className)}
      style={{ background: theme.frame }}
    >
      <div
        aria-hidden
        className={cn(
          "absolute rotate-[-12deg]",
          pinned ? "-top-[120px] -right-[40%] -left-[40%] h-[900px]" : "-inset-[60%]"
        )}
        style={{
          backgroundImage: `conic-gradient(${theme.checkerA} 0 25%, ${theme.checkerB} 0 50%, ${theme.checkerA} 0 75%, ${theme.checkerB} 0)`,
          backgroundSize: `${checkerSize}px ${checkerSize}px`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: pinned
            ? `linear-gradient(180deg, rgba(${theme.wash},0) 0px, rgba(${theme.wash},0.6) 420px)`
            : `linear-gradient(180deg, rgba(${theme.wash},0) 0%, rgba(${theme.wash},0.6) 100%)`,
        }}
      />
      {children}
    </div>
  )
}

/* ---------- left-flag cutout plumbing ---------- */

const NOTCH_H = 28

function leftFlagCornerSvg(notchW: number): string {
  const cw = notchW + 30
  const p = (n: number) => Math.round(n * 100) / 100
  // the flag hole, anchored top-left, tilted right edge, edges bled past
  // the viewBox so anti-aliasing can't leave slivers
  const hole =
    `M-1 -1H${p(notchW)}` +
    `C${p(notchW - 3)} -1 ${p(notchW - 5.3)} 2.4 ${p(notchW - 6.6)} 6.2` +
    `L${p(notchW - 12.4)} 21.8` +
    `C${p(notchW - 14.2)} 25.5 ${p(notchW - 17.3)} 28 ${p(notchW - 22.3)} 28` +
    `H-1Z`
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${cw} ${NOTCH_H + 1}'>` +
    `<path fill-rule='evenodd' d='M0 0H${cw}V${NOTCH_H + 1}H0Z ${hole}' fill='#000'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/* Three mask layers that overlap only on fully-opaque rows/columns, so no
   hairline gaps at fractional zooms and no XOR seams: the fixed-size
   corner piece with the flag hole, the rest of the top strip, and
   everything below. (Exported for the visual editor's editable flag.) */
export function leftFlagMaskStyle(notchW: number): React.CSSProperties {
  const cw = notchW + 30
  const maskImage = `${leftFlagCornerSvg(notchW)}, linear-gradient(#000, #000), linear-gradient(#000, #000)`
  const maskPosition = `top left, ${cw - 1}px 0, 0 ${NOTCH_H}px`
  const maskSize = `${cw}px ${NOTCH_H + 1}px, calc(100% - ${cw - 1}px) ${NOTCH_H + 1}px, 100% calc(100% - ${NOTCH_H}px)`
  const maskRepeat = "no-repeat, no-repeat, no-repeat"
  return {
    WebkitMaskImage: maskImage,
    WebkitMaskPosition: maskPosition,
    WebkitMaskSize: maskSize,
    WebkitMaskRepeat: maskRepeat,
    maskImage,
    maskPosition,
    maskSize,
    maskRepeat,
  } as React.CSSProperties
}

/* Server-rendered, so no real text measurement - instead a per-character
   width table (em fractions of a typical geometric sans, semibold), which
   lands within a few px on real titles where a flat per-char constant
   over- or undershoots badly. Flag = left pad (15) + icon and gap (21) +
   text + tilt zone and breathing room (26). */
const CHAR_EM: [RegExp, number][] = [
  [/[ilj.,':;|!’]/, 0.3],
  [/[ftr\-()[\]]/, 0.38],
  [/ /, 0.28],
  [/[mwMW]/, 0.92],
  [/[A-Z]/, 0.68],
  [/[0-9]/, 0.56],
]

function labelTextWidth(label: string): number {
  const em = 13.5 * 1.05 // semibold runs a touch wide
  let total = 0
  for (const ch of label) {
    const rule = CHAR_EM.find(([re]) => re.test(ch))
    total += (rule ? rule[1] : 0.53) * em
  }
  return total
}

export function estimateFlagWidth(label: string): number {
  const textW = labelTextWidth(label)
  // short labels look cramped with proportional padding - give them more
  const breathing = 26 + Math.min(40, Math.max(0, 40 - textW / 4))
  return Math.min(280, Math.max(110, Math.round(15 + 21 + textW + breathing)))
}

export function FlagFrame({
  theme,
  label,
  icon,
  className,
  children,
}: {
  theme: FrameTheme
  label: string
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const notchW = estimateFlagWidth(label)
  return (
    <CheckerFrame
      theme={theme}
      className={cn("shadow-[0px_4px_14px_-2px_rgba(0,0,0,0.18)]", className)}
    >
      {/* label - sits on the frame, inside the surface cutout */}
      <span className="pointer-events-none absolute top-[5px] left-[5px] z-10 flex h-[28px] items-center gap-[6px] pl-[15px] text-[13.5px] font-semibold tracking-[-0.02em] text-white [filter:drop-shadow(0px_1.5px_3px_rgba(0,0,0,0.3))]">
        {icon}
        {label}
      </span>
      <div
        className="relative rounded-[7px] bg-[var(--jt-surface)] px-[15px] pt-[38px] pb-[13px]"
        style={leftFlagMaskStyle(notchW)}
      >
        {children}
      </div>
    </CheckerFrame>
  )
}
