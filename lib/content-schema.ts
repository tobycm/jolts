import { z } from "zod"

/* The pure half of the content layer: frontmatter schemas, types, and the
   heading-anchor helpers. No node:fs here - this module is shared by the
   server loaders (lib/content.ts) AND the browser-side visual editor,
   which validates drafts against the same schemas CI enforces. */

export const CONTENT_TYPES = ["guides", "concepts", "tools", "pages"] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

/* ---------- frontmatter schemas (validated in CI by scripts/validate-content.mjs) ---------- */

const authorSchema = z.union([z.string(), z.array(z.string()).min(1)])

const baseSchema = z.object({
  title: z.string().min(1),
  /** One-to-two lines selling the outcome. Shown on cards and page headers. */
  subtitle: z.string().min(1),
  /** What search results should say, when `title` is written for someone
      already on the site and not for someone typing into Google. Replaces
      the <title>; the page itself still shows `title`. */
  seoTitle: z.string().optional(),
  /** Meta description. Defaults to `subtitle`. */
  seoDescription: z.string().optional(),
  /** GitHub username(s). Credited on the page; optional. */
  author: authorSchema.optional(),
  /** GitHub usernames of everyone who improved the guide after the
      author - rendered as an avatar stack on the page. */
  contributors: z.array(z.string()).default([]),
  /** Old slugs that should keep working after a rename. */
  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  /** ISO date of last meaningful revision. */
  updated: z.union([z.string(), z.date()]).optional(),
  /** Drafts build locally but are hidden from listings and static params. */
  draft: z.boolean().default(false),
})

export const partSchema = z.object({
  name: z.string().min(1),
  qty: z.union([z.number(), z.string()]).default(1),
  cost: z.string().optional(),
  link: z.string().url().optional(),
  note: z.string().optional(),
  /** Part photo - "./file.jpg" colocated in the guide folder, or a URL. */
  image: z.string().optional(),
})

export const guideSchema = baseSchema.extend({
  type: z.literal("guide"),
  /** A project guide - you finish holding a thing you made (a tamagotchi,
      a dev board). False for the general kind that teaches a practice
      rather than a build, e.g. how to write a good journal. Defaults to
      true: every guide written before this field existed is a project. */
  build: z.boolean().default(true),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  /** Human estimate, e.g. "1 weekend" or "3–4 hours". */
  time: z.string().min(1),
  /** Total-cost estimate, e.g. "~$30". */
  cost: z.string().min(1),
  /** Declared up front - Jolts doesn't prescribe a first project,
      so every card must say what it assumes. */
  soldering: z.boolean(),
  /** "You'll learn: X" chips on the card. */
  learns: z.array(z.string()).min(1),
  parts: z.array(partSchema).min(1),
  /** Slugs of tool pages this build uses. */
  tools: z.array(z.string()).default([]),
  /** Hero image, relative to the guide folder. */
  hero: z.string().optional(),
})

/* Site pages - "Start here", and anything else that is the site talking
   rather than a catalog entry. Structured like a guide (an overview plus
   numbered chapters) but mounted at the site root, so /start stays /start.
   Not creatable from the hubs: these are chrome, not contributions. */
export const pageSchema = baseSchema.extend({
  type: z.literal("page"),
  hero: z.string().optional(),
})

export const conceptSchema = baseSchema.extend({
  type: z.literal("concept"),
  hero: z.string().optional(),
})

export const toolSchema = baseSchema.extend({
  type: z.literal("tool"),
  /** Rough price band for the physical tool, e.g. "$15–40". Omit for software. */
  cost: z.string().optional(),
  hero: z.string().optional(),
})

export const schemaByType = {
  guides: guideSchema,
  concepts: conceptSchema,
  tools: toolSchema,
  pages: pageSchema,
} as const

export type Part = z.infer<typeof partSchema>
export type GuideMeta = z.infer<typeof guideSchema>
export type ConceptMeta = z.infer<typeof conceptSchema>
export type ToolMeta = z.infer<typeof toolSchema>
export type PageMeta = z.infer<typeof pageSchema>
export type EntryMeta = GuideMeta | ConceptMeta | ToolMeta | PageMeta

/* Types whose entries are books: an index.mdx overview plus numbered
   sibling chapters. The rest are single pages. */
export const BOOK_TYPES = ["guides", "pages"] as const
export function isBookType(type: ContentType): boolean {
  return (BOOK_TYPES as readonly string[]).includes(type)
}

/* ---------- reading time ----------
   Words per minute for the reading clock. Deliberately low, the same
   figure aisafety.dance lowballs to: our pages are dense with photos,
   interactive part pickers, and code, so plain wpm overstates how fast
   they actually go. Lives here (fs-free) so the browser-side clock and
   the server loaders share one number. */
export const READING_WPM = 180

/* ---------- heading anchors ---------- */

/** Anchor id for a heading or step title. Must match what the renderer
    stamps on h2s and Step sections. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_[\]]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}
