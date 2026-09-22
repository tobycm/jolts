import { ViewTransition } from "react"

import { notFound } from "next/navigation"

import { GuideBreadcrumb } from "@/components/guide-breadcrumb"
import { GuideNav } from "@/components/guide-nav"
import { buildNavItems } from "@/components/guide-page"
import { ReadingClock } from "@/components/reading-clock"
import {
  entryClockPages,
  entryPath,
  getEntry,
  listBookPages,
  type ContentType,
} from "@/lib/content"
import { typeTheme } from "@/lib/theme"

/* The chrome around a book - left panel and breadcrumb - shared by guides
   and site pages. It lives in a layout so it persists across chapter
   switches: only the column below the breadcrumb re-renders, wrapped in a
   ViewTransition. Both derive the active chapter from the pathname
   client-side. */

export function BookLayout({
  contentType,
  slug,
  hub,
  children,
}: {
  contentType: ContentType
  slug: string
  /** The crumb above this entry, or null for top-level pages. */
  hub?: { label: string; href: string } | null
  children: React.ReactNode
}) {
  const entry = getEntry(contentType, slug)
  if (!entry) notFound()

  const theme = typeTheme[contentType]
  const pages = listBookPages(contentType, entry.slug)
  const navItems = buildNavItems(entry, pages)
  const base = entryPath(contentType, entry.slug)

  return (
    <div className="mx-auto grid w-full max-w-[1020px] gap-x-[52px] gap-y-[28px] px-[28px] pt-[40px] lg:grid-cols-[190px_minmax(0,1fr)]">
      <GuideNav
        entryTitle={entry.meta.title}
        theme={theme}
        items={navItems}
      />
      <div className="min-w-0 max-w-[720px]">
        {/* outside the ViewTransition: stays put while content animates */}
        <GuideBreadcrumb
          guideTitle={entry.meta.title}
          base={base}
          pages={pages.map((p) => ({
            slug: p.slug,
            title: p.title,
            file: p.file,
          }))}
          accent={theme.accent}
          editBase={`/edit/${contentType}/${entry.slug}`}
          hub={hub}
        />
        <ViewTransition default="jolts-content">
          <div className="min-w-0">{children}</div>
        </ViewTransition>
      </div>
      {/* one clock for the whole book: it persists here across chapter
          switches and counts down toward finishing every page */}
      <ReadingClock pages={entryClockPages(entry)} />
    </div>
  )
}
