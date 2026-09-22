"use client"

import { useEffect, useRef, useState } from "react"

import { usePathname } from "next/navigation"

import { GLIDE_START_EVENT } from "@/components/book-link"
import { READING_WPM } from "@/lib/content-schema"

/* The reading clock, lifted from aisafety.dance - same sprite-sheet face,
   same minutes-left label, same corner. The one change is what "left"
   means: a Jolts guide is a book, so the clock counts down toward
   finishing EVERY page, not just the one you're on.

   `pages` is the whole book in reading order (overview, then each
   chapter), each with its word count and URL. The time remaining is
   whatever's unread on this page plus every page still to come, and the
   face sweeps with overall progress through the book. Mounted in the
   persistent book layout, so end-of-chapter-two and top-of-chapter-three
   read the same - the count flows straight through.

   Paging is the fiddly part. BookLink's `glideToTop` rewinds the scroll to
   the top with a custom rAF ease-out and only THEN pushes the route, so
   the rewind happens on the old page while our index is unchanged. Sampled
   naively the clock would run backwards as the page rewinds, then snap
   forward on the swap - the yo-yo. So we freeze on the glide's start
   signal and stay frozen until the new page has settled at the top, and
   the display is written only from the effect, never from render. What's
   shown holds perfectly still across the whole transition.

   Single pages (concepts, tools) pass a one-element list and it behaves
   like an ordinary per-page reader. */

export type ClockPage = { words: number; href: string }

// sprite sheet layout: 120 frames, empty clock -> full
const COLS = 12
const ROWS = 10
const FRAMES = COLS * ROWS

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)
const scrollY = () =>
  window.scrollY || document.documentElement.scrollTop || 0

type Face = { min: number; frame: number }

export function ReadingClock({ pages }: { pages: ClockPage[] }) {
  const pathname = usePathname()

  // Everything the widget shows lives here, and only the effect writes it.
  const [face, setFace] = useState<Face | null>(null)
  // True from a glide's start until the destination page's effect takes
  // over. The glide rewinds the scroll on the OLD page (index unchanged),
  // so we must keep holding through it - including the final frame that
  // lands at the top - and only release once the route has actually
  // changed. Anything less flashes the old page's top value on the way out.
  const glidingRef = useRef(false)

  // The glide fires before the route changes, so catch it on window and
  // freeze at once - the per-page effect below can't know in time.
  useEffect(() => {
    const onGlide = () => {
      glidingRef.current = true
    }
    window.addEventListener(GLIDE_START_EVENT, onGlide)
    return () => window.removeEventListener(GLIDE_START_EVENT, onGlide)
  }, [])

  useEffect(() => {
    const total = pages.reduce((sum, p) => sum + p.words, 0)
    if (total === 0) return

    const normalized = pathname.replace(/\/+$/, "") || "/"
    const at = pages.findIndex((p) => p.href === normalized)
    // Mid-swap the pathname can briefly be one that isn't in this book yet.
    // Guessing index 0 there would flash the full-book ETA, so hold the
    // last value (stay frozen) and wait for the effect that runs on the
    // settled route.
    if (at === -1 && pages.length > 1) return
    const index = at === -1 ? 0 : at
    const current = pages[index]?.words ?? 0
    const wordsAfter = pages
      .slice(index + 1)
      .reduce((sum, p) => sum + p.words, 0)
    const wordsBefore = total - wordsAfter - current

    // We've locked onto the real destination page: the glide/nav hold is
    // over, so let go and start tracking this page's scroll.
    glidingRef.current = false

    const faceAt = (progress: number): Face => {
      // ETA of finishing ALL pages: unread here + everything after
      const remainingWords = wordsAfter + (1 - progress) * current
      const min = Math.ceil(remainingWords / READING_WPM)
      // whole-book progress sweeps the sprite-sheet face
      const overall = clamp01((wordsBefore + progress * current) / total)
      const frame = Math.min(FRAMES - 1, Math.floor(overall * (FRAMES - 1)))
      return { min, frame }
    }

    // Landing not-quite-at-top (a glide handed over to a real scroll) - let
    // the scroll settle before tracking so it doesn't start mid-page.
    let settling = scrollY() > 8

    let raf = 0
    const sample = () => {
      raf = 0
      if (glidingRef.current) return // a fresh glide started - hold
      if (settling) {
        if (scrollY() > 8) return
        settling = false
      }
      const el = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      setFace(faceAt(max > 0 ? clamp01(scrollY() / max) : 1))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sample)
    }

    // Fallback: nothing scrolls on a short or already-topped page, so
    // release the settle even if no scroll event lands.
    const thaw = window.setTimeout(() => {
      settling = false
      sample()
    }, 650)

    sample()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      clearTimeout(thaw)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [pathname, pages])

  if (!face) return null

  const x = face.frame % COLS
  const y = Math.floor(face.frame / COLS)
  const backgroundPosition = `${(x / (COLS - 1)) * 100}% ${(y / (ROWS - 1)) * 100}%`
  const label = face.min <= 0 ? "\u{1F389}\u{1F389}\u{1F389}" : `~${face.min}m`

  return (
    <div
      className="reading-clock"
      role="status"
      aria-label={
        face.min <= 0
          ? "Finished reading"
          : `About ${face.min} minutes left to finish`
      }
    >
      <div
        className="reading-clock__icon"
        style={{ backgroundPosition }}
        aria-hidden
      />
      <div className="reading-clock__label">{label}</div>
    </div>
  )
}
