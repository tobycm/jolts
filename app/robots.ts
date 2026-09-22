import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // authoring and curation surfaces, not public content
      disallow: ["/edit", "/review", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
