"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

/* A link between pages of a book that takes the reader back to the top
   before the page underneath them changes.

   The scroll has to finish first, not run alongside the navigation. The
   router resets scroll in a layout effect, which lands inside the view
   transition's update callback, and `::view-transition` is positioned in
   the snapshot containing block - pinned to the viewport, not scrolled
   with the page. A scroll animating under it would be invisible until
   the transition ended and then appear as a jump. So: glide to the top,
   then push, and the transition captures both sides at rest.

   Next's own scroll then finds the column's top edge already in view and
   exits early, so it doesn't fight this. */

/* Fired on window the instant a book navigation is committed to on click,
   before any scroll reset (the glide, or plain navigation's own). Anything
   that samples the scroll to show progress (the reading clock) has to hold
   still while the page rewinds to the top under it, or it reads the rewind
   as un-reading - and the rewind runs on the OLD page, so watching for the
   pathname to change catches it too late. This is the earlier signal; the
   listener resumes once the destination page settles. */
export const GLIDE_START_EVENT = "jolts:glide-start"

// the most page the glide actually travels, in viewport heights
const RUNWAY_VH = 0.8

// distance-proportional, but bounded at both ends: a nudge shouldn't
// crawl and a full runway shouldn't outstay the transition that follows
const MS_PER_PX = 0.35
const MIN_MS = 140
const MAX_MS = 240

/* Under this the glide is skipped outright and the link navigates on the
   spot. Animating a correction this small buys nothing and still has to
   be waited out - and the floor on the duration means the shorter the
   trip, the worse that trade gets. */
const FLOOR_VH = 0.1

/* CSS timing functions, sampled by hand: the glide has to be able to run
   the same curve as the stylesheet, and there is no way to hand a
   cubic-bezier to rAF. Newton-Raphson on x, bisection where the slope
   goes flat. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const x = (t: number) => ((ax * t + bx) * t + cx) * t
  const y = (t: number) => ((ay * t + by) * t + cy) * t
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  return (at: number) => {
    let t = at
    for (let i = 0; i < 8; i++) {
      const err = x(t) - at
      if (Math.abs(err) < 1e-4) return y(t)
      const slope = dx(t)
      if (Math.abs(slope) < 1e-6) break
      t -= err / slope
    }
    let lo = 0
    let hi = 1
    t = at
    for (let i = 0; i < 20 && Math.abs(x(t) - at) > 1e-4; i++) {
      if (x(t) < at) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return y(t)
  }
}

/* Ease-out cubic: off the mark at once, decelerating into the top. A
   click starts this motion, so any slow head reads as a dead button.
   Stronger ease-outs (quint, expo) are 96% done by the halfway mark and
   spend the rest of the duration crawling the last few pixels. */
const glideEase = cubicBezier(0.33, 1, 0.68, 1)

/* <html> is `scroll-smooth`, for the in-page anchors. A plain scrollTo
   would inherit that and hand each frame's target to the browser as a
   fresh animation to ease toward, so the glide would be chasing an
   interpolation instead of setting a position. `instant` is the CSSOM
   opt-out; it overrides the stylesheet rather than deferring to it,
   which is what `auto` does. */
const cut = (top: number) => window.scrollTo({ top, behavior: "instant" })

/** Cancels the glide in flight, if any. A second click supersedes the first. */
let cancelActive: (() => void) | null = null

function glideToTop(from: number, done: () => void) {
  cancelActive?.()

  /* Only the last stretch is animated; anything above it is cut. Held to
     one screen or so, every glide is the same short trip whatever depth
     it started from, which is what lets the curve stay gentle without
     the whole thing dragging. */
  const runway = Math.min(from, window.innerHeight * RUNWAY_VH)
  if (runway < from) cut(runway)

  const duration = Math.min(MAX_MS, Math.max(MIN_MS, runway * MS_PER_PX))
  /* clocked from the click, not from the first frame that gets to run.
     If something holds the main thread on the way in, the glide should
     lose the frames it slept through - anchoring to the first callback
     instead just postpones the whole curve, which is felt as a slow
     head no matter what the curve is. */
  const startedAt = performance.now()
  let frame = 0

  const stop = () => {
    cancelAnimationFrame(frame)
    window.removeEventListener("wheel", handOver)
    window.removeEventListener("touchstart", handOver)
    if (cancelActive === stop) cancelActive = null
  }

  /* the reader taking the scroll back mid-flight outranks the animation -
     stop moving the page under them and just navigate */
  function handOver() {
    stop()
    done()
  }

  const step = (now: number) => {
    const t = Math.min(1, (now - startedAt) / duration)
    cut(Math.round(runway * (1 - glideEase(t))))
    if (t < 1) {
      frame = requestAnimationFrame(step)
      return
    }
    stop()
    done()
  }

  window.addEventListener("wheel", handOver, { passive: true, once: true })
  window.addEventListener("touchstart", handOver, { passive: true, once: true })
  frame = requestAnimationFrame(step)
  cancelActive = stop
}

export function BookLink({
  href,
  onClick,
  children,
  ...rest
}: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }) {
  const router = useRouter()

  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        // modifier and middle clicks belong to the browser
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
          return

        // A page switch is coming - freeze any scroll-driven widget (the
        // reading clock) before either the glide OR the plain-navigation
        // scroll reset moves the page under it. Only for a real route
        // change: firing this for a click on the page we're already on
        // would leave the widget frozen with no navigation to thaw it.
        const here = window.location.pathname.replace(/\/+$/, "")
        const dest = href.replace(/\/+$/, "")
        if (dest !== here) window.dispatchEvent(new Event(GLIDE_START_EVENT))

        if (window.scrollY <= window.innerHeight * FLOOR_VH) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
          return

        /* No prefetch call here on purpose: Link already warms the route
           on hover and in the viewport, and asking for it again on the
           click puts a fetch - in dev, an on-demand route compile - on
           the main thread in the same tick the glide starts. */
        e.preventDefault()
        glideToTop(window.scrollY, () => router.push(href))
      }}
      {...rest}
    >
      {children}
    </Link>
  )
}
