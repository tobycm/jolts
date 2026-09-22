import type { Metadata } from "next"

import { NewEntryFlow } from "@/components/editor/new-entry"
import { CONTENT_TYPES, listEntries, plainExcerpt } from "@/lib/content"

export const metadata: Metadata = {
  title: "Write something new",
  robots: { index: false },
}

/* Start screen for brand-new entries: statically generated, everything
   after the first click is client-side. */

export default function NewEntryPage() {
  const linkIndex = {
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
  const existingSlugs = Object.fromEntries(
    CONTENT_TYPES.map((t) => [
      t,
      listEntries(t).flatMap((e) => [e.slug, ...e.meta.aliases]),
    ])
  ) as Record<(typeof CONTENT_TYPES)[number], string[]>

  return <NewEntryFlow linkIndex={linkIndex} existingSlugs={existingSlugs} />
}
