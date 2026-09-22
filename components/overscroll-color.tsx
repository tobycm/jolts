"use client"

import { useEffect } from "react"

/* macOS/iOS paint the top rubber-band gutter with the ROOT background-colour;
   nothing in the DOM can cover it (content above y=0 and `fixed` backgrounds
   are both skipped there). So the top overscroll only reads as an extension of
   the blue header if <html>'s own background is the header colour AT THAT
   MOMENT - which is only ever while scrolled to the very top.

   This flags <html data-at-top> whenever the page is at (or bounced past) the
   top, and globals.css swaps the root background to --jt-header there and back
   to --jt-page otherwise. The bottom bounce is only reachable once scrolled
   away from the top, where the flag is off, so it keeps the page colour. */
export function OverscrollColor() {
  useEffect(() => {
    const root = document.documentElement
    let atTop: boolean | null = null

    const update = () => {
      // <=0 so the negative scrollTop of an active top-bounce still counts
      const next = window.scrollY <= 0
      if (next === atTop) return
      atTop = next
      root.toggleAttribute("data-at-top", next)
    }

    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update, { passive: true })
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  return null
}
