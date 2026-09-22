import matter from "gray-matter"

import {
  CONTENT_TYPES,
  entryPath,
  getEntry,
  listBookPages,
  listEntries,
  type ContentType,
} from "@/lib/content"

/* Raw-markdown variant of every guide, served at /:type/:slug.md via a
   rewrite in next.config.ts. Statically generated for every entry. */

export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return CONTENT_TYPES.flatMap((type) =>
    listEntries(type).map((e) => ({ type, slug: e.slug }))
  )
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/md/[type]/[slug]">
) {
  const { type, slug } = await ctx.params
  if (!CONTENT_TYPES.includes(type as ContentType)) {
    return new Response("Not found", { status: 404 })
  }
  const entry = getEntry(type as ContentType, slug)
  if (!entry) return new Response("Not found", { status: 404 })

  // books ship as one markdown document: overview + chapters
  let body = entry.body
  for (const page of listBookPages(entry.contentType, entry.slug)) {
    body += `\n\n---\n\n# ${page.title}\n\n${page.body.trim()}\n`
  }

  // re-serialize frontmatter so aliases/drafts round-trip exactly
  const raw = matter.stringify(body, {
    ...entry.meta,
    canonical: `https://jolts.hackclub.com${entryPath(entry.contentType, entry.slug)}`,
    license:
      "text/images CC BY-SA 4.0, code MIT - https://jolts.hackclub.com/contribute",
  })
  return new Response(raw, {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  })
}
