"use client"

import { useEffect, useRef, useState } from "react"

import { usePathname } from "next/navigation"

import { BookLink } from "@/components/book-link"
import { CheckerFrame } from "@/components/checker-frame"
import type { TocEntry } from "@/lib/content"
import type { TypeTheme } from "@/lib/theme"

/* The left panel: guide title on the checker chrome, page list on the
   white surface, and the ACTIVE page's table of contents nested beneath
   its name.

   For guides this renders from the [slug] layout, so it persists across
   page switches - the DOM never remounts. The active page comes from
   usePathname, and flipping it swaps grid-rows classes on the always-
   mounted TOC nodes: the old list collapses while the new one expands in
   one fast-settling transition. A scrollspy highlights the section
   currently being read. */

export type NavItem = {
  /** null = the overview / the page itself */
  slug: string | null
  title: string
  href: string
  toc: TocEntry[]
}

export function GuideNav({
  entryTitle,
  theme,
  items,
}: {
  entryTitle: string
  theme: TypeTheme
  items: NavItem[]
}) {
  const pathname = usePathname()
  const normalized = pathname.replace(/\/$/, "")
  const current =
    items.find((item) => item.href === normalized)?.slug ?? null
  const multi = items.length > 1

  /* Next scrolls the changed segment into view, which lands mid-page:
     entering a guide from a scrolled hub stops at the title, and page
     switches keep the old depth. Always land at the very top instead -
     both on mount (entering the guide) and on page switches - unless
     we're deep-linking to a #section. */
  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, behavior: "instant" })
    }
  }, [pathname])

  /* scrollspy: the last section whose anchor has passed the reading line.
     Section offsets are cached (re-measured on resize and again after
     late image loads), so the scroll handler is pure arithmetic - no
     forced layout per frame. */
  const [readingId, setReadingId] = useState<string | null>(null)
  useEffect(() => {
    const item = items.find((i) => i.slug === current)
    const ids = (item?.toc ?? []).map((t) => t.id)
    let marks: { id: string; y: number }[] = []
    const measure = () => {
      marks = ids
        .map((id) => {
          const el = document.getElementById(id)
          return el
            ? { id, y: el.getBoundingClientRect().top + window.scrollY }
            : null
        })
        .filter((m): m is { id: string; y: number } => m !== null)
      onScroll()
    }
    const onScroll = () => {
      const line = window.scrollY + 140
      let id: string | null = marks[0]?.id ?? null
      for (const m of marks) if (m.y <= line) id = m.id
      setReadingId(id)
    }
    // measure after paint, and again once images have had a chance to load
    const raf = requestAnimationFrame(measure)
    const late = [setTimeout(measure, 600), setTimeout(measure, 2000)]
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", measure)
    return () => {
      cancelAnimationFrame(raf)
      late.forEach(clearTimeout)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", measure)
    }
  }, [items, current])

  return (
    /* the rail: absolutely positioned to span the grid row, giving the
       sticky panel inside it travel for the whole article - pinning stays
       pure CSS, compositor-smooth, zero scroll JS. Do not overshoot past
       the row: an absolute box still extends the document's scroll height,
       which reads as dead space under the footer. */
    <div className="relative min-w-0">
    <div className="lg:absolute lg:top-0 lg:bottom-0 lg:w-[190px]">
    <nav
      aria-label="Guide pages"
      className="relative overflow-hidden rounded-[12px] p-[5px] shadow-[0px_3px_13px_0px_rgba(0,0,0,0.14)] lg:sticky lg:top-[28px] lg:flex lg:max-h-[calc(100vh-56px)] lg:flex-col"
    >
      <CheckerFrame
        theme={theme}
        checkerSize={110}
        pinned
        className="absolute inset-0 rounded-[12px] p-0"
      >
        {null}
      </CheckerFrame>

      {/* guide title on the frame itself, like the header's nav text */}
      <p className="relative px-[10px] pt-[4px] pb-[8px] text-[14.5px] font-semibold tracking-[-0.02em] text-white [filter:drop-shadow(0px_1px_3px_rgba(0,0,0,0.25))]">
        {entryTitle}
      </p>

      <div className="relative min-h-0 overflow-y-auto rounded-[7px] bg-[var(--jt-surface)] px-[13px] py-[9px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.15)]">
        <ol className="space-y-[1px]">
          {items.map((item, i) => {
            const active = item.slug === current
            return (
              <li key={item.href}>
                <div className="flex items-baseline gap-[8px]">
                  {multi && (
                    <span
                      aria-hidden
                      className="w-[13px] shrink-0 text-right text-[11.5px] tabular-nums transition-colors duration-200"
                      style={{ color: active ? theme.accent : "var(--jt-fainter)" }}
                    >
                      {/* the overview is home, not step one - pages carry
                          the numbers (mirrors the editor's rail) */}
                      {item.slug === null ? "•" : i}
                    </span>
                  )}
                  {active ? (
                    <span
                      aria-current="page"
                      className="min-w-0 flex-1 py-[3px] text-[13.5px] font-semibold tracking-[-0.02em]"
                      style={{ color: theme.accent }}
                    >
                      {item.title}
                    </span>
                  ) : (
                    <BookLink
                      href={item.href}
                      className="min-w-0 flex-1 py-[3px] text-[13.5px] tracking-[-0.02em] text-[var(--jt-muted)] transition-colors duration-150 hover:text-[var(--jt-ink)]"
                    >
                      {item.title}
                    </BookLink>
                  )}
                </div>

                {/* always mounted, collapsed to 0fr when inactive - the
                    class flip animates both directions at once */}
                {item.toc.length > 0 && (
                  <div
                    inert={active ? undefined : true}
                    className={
                      "grid transition-[grid-template-rows] duration-200 [transition-timing-function:cubic-bezier(0.3,0,0,1)] " +
                      (active ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
                    }
                  >
                    <div className="min-h-0 overflow-hidden">
                      <ul
                        className={
                          "mt-[2px] mb-[4px] space-y-[1px] border-l border-[var(--jt-line)] pl-[10px] " +
                          (multi ? "ml-[19px]" : "ml-[2px]")
                        }
                      >
                        {item.toc.map((section) => {
                          const reading = active && readingId === section.id
                          return (
                            <li key={section.id}>
                              <a
                                href={`${active ? "" : item.href}#${section.id}`}
                                className={
                                  "block truncate py-[2.5px] text-[12.5px] tracking-[-0.01em] transition-colors duration-150 " +
                                  (reading
                                    ? "font-medium"
                                    : "text-[var(--jt-faint)] hover:text-[var(--jt-ink)]")
                                }
                                style={
                                  reading ? { color: theme.accent } : undefined
                                }
                              >
                                {section.title}
                              </a>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
    </div>
    </div>
  )
}
