import type { MetadataRoute } from "next"

import {
  CONTENT_TYPES,
  entryPath,
  listBookPages,
  listEntries,
} from "@/lib/content"
import { SITE_URL } from "@/lib/site"

/* Statically generated at build time, like the rest of the content.
   listEntries already hides drafts, and aliases are omitted - they only
   exist to 301 to the canonical slug. */

export default function sitemap(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [
    { url: SITE_URL, priority: 1 },
    ...["/guides", "/concepts", "/tools", "/contribute"].map((p) => ({
      url: `${SITE_URL}${p}`,
      priority: 0.8,
    })),
  ]

  for (const type of CONTENT_TYPES) {
    for (const entry of listEntries(type)) {
      const base = `${SITE_URL}${entryPath(type, entry.slug)}`
      const lastModified = entry.meta.updated
        ? new Date(entry.meta.updated)
        : undefined
      urls.push({
        url: base,
        lastModified,
        priority: type === "guides" ? 0.9 : 0.7,
      })
      for (const page of listBookPages(type, entry.slug)) {
        urls.push({ url: `${base}/${page.slug}`, lastModified, priority: 0.6 })
      }
    }
  }

  return urls
}
