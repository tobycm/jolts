import fs from "node:fs"
import path from "node:path"

import matter from "gray-matter"
import { cache } from "react"
import { z } from "zod"

import { isBookType, schemaByType, slugifyHeading, type ContentType, type ConceptMeta, type EntryMeta, type GuideMeta, type PageMeta, type ToolMeta } from "@/lib/content-schema"

/* The content layer. Plain MDX files on disk - no database, no CMS.
   content/{builds,concepts,tools}/<slug>/index.mdx, images colocated.
   Everything is read at build time (all routes are statically generated),
   so none of this code runs per-request in production.

   The frontmatter schemas live in lib/content-schema.ts (fs-free, shared
   with the browser-side visual editor) and are re-exported here so
   existing imports keep working. */

export {
  BOOK_TYPES,
  CONTENT_TYPES,
  conceptSchema,
  guideSchema,
  isBookType,
  pageSchema,
  partSchema,
  schemaByType,
  slugifyHeading,
  toolSchema,
  type ConceptMeta,
  type ContentType,
  type EntryMeta,
  type GuideMeta,
  type PageMeta,
  type ToolMeta,
} from "@/lib/content-schema"

export const CONTENT_DIR = path.join(process.cwd(), "content")

export type Entry<M extends EntryMeta = EntryMeta> = {
  slug: string
  contentType: ContentType
  meta: M
  /** Raw MDX body (frontmatter stripped). */
  body: string
}

/* ---------- loaders ---------- */

function readEntry(contentType: ContentType, slug: string): Entry | null {
  const file = path.join(CONTENT_DIR, contentType, slug, "index.mdx")
  if (!fs.existsSync(file)) return null
  const { data, content } = matter(fs.readFileSync(file, "utf8"))
  const meta = schemaByType[contentType].parse(data)
  return { slug, contentType, meta, body: content }
}

export const getEntry = cache((contentType: ContentType, slug: string) => {
  const direct = readEntry(contentType, slug)
  if (direct) return direct
  // aliases: old slugs keep resolving after a rename
  for (const entry of listEntries(contentType)) {
    if (entry.meta.aliases.includes(slug)) return entry
  }
  return null
})

export const listEntries = cache((contentType: ContentType): Entry[] => {
  const dir = path.join(CONTENT_DIR, contentType)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readEntry(contentType, d.name))
    .filter((e): e is Entry => e !== null && !e.meta.draft)
    .sort((a, b) => a.meta.title.localeCompare(b.meta.title))
})

export const listGuides = () => listEntries("guides") as Entry<GuideMeta>[]
export const listPages = () => listEntries("pages") as Entry<PageMeta>[]
export const listConcepts = () => listEntries("concepts") as Entry<ConceptMeta>[]
export const listTools = () => listEntries("tools") as Entry<ToolMeta>[]

/* Where an entry lives. Every type is namespaced under its own hub
   (/guides/macropad) except pages, which are the site's own top-level
   URLs - content/pages/start is /start, not /pages/start. Anything that
   builds a link to an entry goes through here. */
export function entryPath(contentType: ContentType, slug: string): string {
  return contentType === "pages" ? `/${slug}` : `/${contentType}/${slug}`
}

export function authors(meta: EntryMeta): string[] {
  if (!meta.author) return []
  return Array.isArray(meta.author) ? meta.author : [meta.author]
}

/* ---------- book chapters ----------
   A guide is a small book: index.mdx is the overview (frontmatter + intro
   + parts list) and numbered siblings are its pages, one per stage - content/guides/macropad/01-soldering.mdx → /guides/macropad/soldering.
   The number gives the order; the rest of the filename is the URL slug.
   Site pages are built the same way (content/pages/start/01-*.mdx →
   /start/...), which is what isBookType distinguishes. */

const bookPageSchema = z.object({
  title: z.string().min(1),
  /** Search-result title, when `title` reads well in the page list but
      not in Google. Overrides the whole <title>, chapter and entry both. */
  seoTitle: z.string().optional(),
  /** Meta description. Defaults to the page's opening prose. */
  seoDescription: z.string().optional(),
})

export type BookPage = {
  slug: string
  order: number
  title: string
  seoTitle?: string
  seoDescription?: string
  body: string
  /** filename within the entry folder, e.g. "02-soldering.mdx" */
  file: string
}

export const listBookPages = cache(
  (contentType: ContentType, slug: string): BookPage[] => {
    if (!isBookType(contentType)) return []
    const dir = path.join(CONTENT_DIR, contentType, slug)
    if (!fs.existsSync(dir)) return []
    return fs
      .readdirSync(dir)
      .map((f) => f.match(/^(\d+)-(.+)\.mdx$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => {
        const { data, content } = matter(
          fs.readFileSync(path.join(dir, m[0]), "utf8")
        )
        const meta = bookPageSchema.parse(data)
        return {
          slug: m[2],
          order: Number(m[1]),
          title: meta.title,
          seoTitle: meta.seoTitle,
          seoDescription: meta.seoDescription,
          body: content,
          file: m[0],
        }
      })
      .sort((a, b) => a.order - b.order)
  }
)

export function getBookPage(
  contentType: ContentType,
  slug: string,
  pageSlug: string
): BookPage | null {
  return (
    listBookPages(contentType, slug).find((p) => p.slug === pageSlug) ?? null
  )
}

/* ---------- in-page table of contents ---------- */

export type TocEntry = { id: string; title: string }

/** The two things that become anchors on a page: ## headings and <Step>
    titles. Shared by the toc and the search index so they never drift. */
const SECTION_RE = /^##\s+(.+)$|<Step\s[^>]*?title="([^"]+)"/gm

function cleanHeading(raw: string): string {
  return raw
    .replace(/[`*_]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim()
}

/** Section list of one page: ## headings and <Step> titles, in order. */
export function extractToc(body: string): TocEntry[] {
  return [...body.matchAll(SECTION_RE)].map((m) => {
    const title = cleanHeading(m[1] ?? m[2])
    return { id: slugifyHeading(title), title }
  })
}

export type Section = TocEntry & {
  /** The section's own prose, plain text, up to the next heading. */
  text: string
}

/** extractToc's sections, each carrying the prose that follows it. The
    search index needs the text, not just the anchor - matching headings
    alone misses almost everything a page actually says. */
export function extractSections(body: string): Section[] {
  const matches = [...body.matchAll(SECTION_RE)]
  return matches.map((m, i) => {
    const title = cleanHeading(m[1] ?? m[2])
    const from = m.index + m[0].length
    const to = matches[i + 1]?.index ?? body.length
    return {
      id: slugifyHeading(title),
      title,
      text: plainText(body.slice(from, to)),
    }
  })
}

/** Everything before the first section heading - the page's own intro.
    Kept separate from extractSections so the index stores each run of
    prose exactly once. */
export function leadText(body: string): string {
  const [first] = body.matchAll(SECTION_RE)
  return plainText(first ? body.slice(0, first.index) : body)
}

/** MDX body → readable prose. Strips code fences, comments, JSX tags,
    headings, images, and markdown punctuation. */
export function plainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Plain-text opening of a guide's body - used by the hover previews on
    cross-links, Wikipedia-style. Cuts at a word boundary. */
export function plainExcerpt(body: string, maxLength = 220): string {
  const text = plainText(body)
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength)
  return cut.slice(0, cut.lastIndexOf(" ")) + " …"
}

/* ---------- reading time ----------
   Stolen from aisafety.dance's reading clock: count the words, divide by
   a deliberately low words-per-minute (READING_WPM in lib/content-schema
   - these pages carry photos, part pickers, and code the eye lingers on),
   round up. We count words from the source prose (plainText strips code,
   JSX, and markup) rather than the rendered DOM, which lets us total a
   whole book at build time.

   A book (guide or site page) is many chapters, so its reading time is
   the ETA of finishing ALL of them. entryClockPages returns one entry per
   page in reading order - the overview first, then each chapter - each
   carrying its word count and its URL. The client-side ReadingClock sums
   them and counts down across page switches toward the very last word. */

export function wordCount(body: string): number {
  const text = plainText(body)
  return text ? text.split(/\s+/).length : 0
}

export type ClockPage = { words: number; href: string }

export function entryClockPages(entry: Entry): ClockPage[] {
  const base = entryPath(entry.contentType, entry.slug)
  const overview: ClockPage = { words: wordCount(entry.body), href: base }
  if (!isBookType(entry.contentType)) return [overview]
  return [
    overview,
    ...listBookPages(entry.contentType, entry.slug).map((p) => ({
      words: wordCount(p.body),
      href: `${base}/${p.slug}`,
    })),
  ]
}

/** Map a guide-relative image path ("./photo.jpg") to its served URL. */
export function contentImageUrl(
  contentType: ContentType,
  slug: string,
  src: string
): string {
  if (!src.startsWith("./")) return src
  return `/content-images/${contentType}/${slug}/${src.slice(2)}`
}
