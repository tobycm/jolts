"use client"

import { House, PencilSimple } from "@phosphor-icons/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { BookLink } from "@/components/book-link"

/* Breadcrumb for book pages: [home] / Guides / <guide> / <page>.
   Lives in the book layout OUTSIDE the ViewTransition, so it stays put
   while the page content animates. Every segment is clickable; the page
   segment is derived from the pathname client-side, since the layout
   doesn't re-render between page switches. Site pages pass hub={null} -
   /start is a top-level destination with no hub above it. */

export function GuideBreadcrumb({
  guideTitle,
  base,
  pages,
  accent,
  editBase,
  hub = { label: "Guides", href: "/guides" },
}: {
  guideTitle: string
  /** e.g. /guides/macropad */
  base: string
  pages: { slug: string; title: string; file: string }[]
  accent: string
  /** visual-editor URL for this guide, without the ?page= */
  editBase?: string
  /** The hub crumb above this entry, or null for top-level pages. */
  hub?: { label: string; href: string } | null
}) {
  const pathname = usePathname().replace(/\/$/, "")
  const pageSlug = pathname.startsWith(`${base}/`)
    ? pathname.slice(base.length + 1)
    : null
  const page = pages.find((p) => p.slug === pageSlug) ?? null

  const sep = (
    <span aria-hidden className="text-[var(--jt-fainter)]">
      /
    </span>
  )

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-[18px] flex flex-wrap items-center gap-[8px] text-[13px] tracking-[-0.01em]"
    >
      <Link
        href="/"
        aria-label="Home"
        className="flex items-center text-[var(--jt-faint)] transition-colors duration-150 hover:text-[var(--jt-ink)]"
      >
        <House size={14} weight="fill" aria-hidden />
      </Link>
      {sep}
      {hub && (
        <>
          <Link
            href={hub.href}
            className="text-[var(--jt-faint)] transition-colors duration-150 hover:text-[var(--jt-ink)]"
          >
            {hub.label}
          </Link>
          {sep}
        </>
      )}
      <BookLink
        href={base}
        className={
          page
            ? "text-[var(--jt-faint)] transition-colors duration-150 hover:text-[var(--jt-ink)]"
            : "font-semibold"
        }
        style={page ? undefined : { color: accent }}
        aria-current={page ? undefined : "page"}
      >
        {guideTitle}
      </BookLink>
      {page && (
        <>
          {sep}
          <Link
            href={`${base}/${page.slug}`}
            aria-current="page"
            className="font-semibold"
            style={{ color: accent }}
          >
            {page.title}
          </Link>
        </>
      )}
      {editBase && (
        <Link
          href={`${editBase}?page=${page?.file ?? "index.mdx"}`}
          className="ml-auto inline-flex items-center gap-[5px] text-[var(--jt-faint)] transition-colors duration-150 hover:text-[var(--jt-ink)]"
        >
          <PencilSimple size={13} weight="fill" aria-hidden />
          Edit
        </Link>
      )}
    </nav>
  )
}
