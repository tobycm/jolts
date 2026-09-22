import fs from "node:fs"
import path from "node:path"

import type { Metadata } from "next"
import { notFound } from "next/navigation"

import type { LinkIndex } from "@/components/editor/context"
import { EditorShell, type EditorFileIn } from "@/components/editor/editor-shell"
import {
  CONTENT_DIR,
  CONTENT_TYPES,
  getEntry,
  listEntries,
  plainExcerpt,
  type ContentType,
} from "@/lib/content"

/* The visual editor for an existing entry. The page itself is static like
   the rest of the site - the entry's raw files, the cross-link index, and
   the folder's image list are all baked in at build time, and editing
   happens entirely in the browser. Saving is the one server round-trip:
   /api/github/* turns the change set into a pull request. */

export const dynamicParams = false

export function generateStaticParams() {
  return CONTENT_TYPES.flatMap((type) =>
    listEntries(type).map((e) => ({ type, slug: e.slug }))
  )
}

export async function generateMetadata(
  props: PageProps<"/edit/[type]/[slug]">
): Promise<Metadata> {
  const { type, slug } = await props.params
  const entry = CONTENT_TYPES.includes(type as ContentType)
    ? getEntry(type as ContentType, slug)
    : null
  return {
    title: entry ? `Editing ${entry.meta.title}` : "Editor",
    robots: { index: false },
  }
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i

function buildLinkIndex(): LinkIndex {
  return {
    concepts: listEntries("concepts").map((e) => ({
      slug: e.slug,
      title: e.meta.title,
      excerpt: plainExcerpt(e.body, 120),
    })),
    tools: listEntries("tools").map((e) => ({
      slug: e.slug,
      title: e.meta.title,
      excerpt: plainExcerpt(e.body, 120),
      cost: e.meta.type === "tool" ? e.meta.cost : undefined,
    })),
  }
}

export default async function EditPage(props: PageProps<"/edit/[type]/[slug]">) {
  const { type, slug } = await props.params
  if (!CONTENT_TYPES.includes(type as ContentType)) notFound()
  const contentType = type as ContentType
  const entry = getEntry(contentType, slug)
  if (!entry || entry.slug !== slug) notFound()

  const dir = path.join(CONTENT_DIR, contentType, entry.slug)
  const names = fs.readdirSync(dir).sort()

  const files: EditorFileIn[] = [
    { name: "index.mdx", raw: fs.readFileSync(path.join(dir, "index.mdx"), "utf8") },
    ...names
      .filter((n) => /^\d+-.+\.mdx$/.test(n))
      .map((n) => ({
        name: n,
        raw: fs.readFileSync(path.join(dir, n), "utf8"),
      })),
  ]

  const existingImages = names.filter((n) => IMAGE_EXT.test(n))

  return (
    <EditorShell
      contentType={contentType}
      slug={entry.slug}
      mode="edit"
      files={files}
      linkIndex={buildLinkIndex()}
      existingImages={existingImages}
    />
  )
}
