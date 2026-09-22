import { entryPath, type ContentType, type Entry } from "@/lib/content"
import { SITE_NAME, SITE_URL } from "@/lib/site"

/* Schema.org graphs. Entry pages carry their own (EntryJsonLd, in
   guide-page.tsx); this file holds the primitive plus the two graphs that
   belong to pages without an entry behind them - the home page and the
   hub listings.

   Everything anchors to two @ids so the graphs join up instead of each
   page asserting an unrelated site. */

export const WEBSITE_ID = `${SITE_URL}#website`
export const PUBLISHER_ID = "https://hackclub.com#organization"
export const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        // <-escape so content text can never close the script tag
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}

/** Site identity, emitted once from the home page. */
export function SiteJsonLd({ description }: { description: string }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": PUBLISHER_ID,
            name: "Hack Club",
            url: "https://hackclub.com",
          },
          {
            "@type": "WebSite",
            "@id": WEBSITE_ID,
            name: SITE_NAME,
            url: SITE_URL,
            description,
            inLanguage: "en",
            license: LICENSE_URL,
            publisher: { "@id": PUBLISHER_ID },
          },
        ],
      }}
    />
  )
}

/** A hub listing (/guides, /concepts, /tools) as an ordered collection. */
export function CollectionJsonLd({
  contentType,
  title,
  description,
  entries,
}: {
  contentType: ContentType
  title: string
  description: string
  entries: Entry[]
}) {
  const url = `${SITE_URL}/${contentType}`
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
              { "@type": "ListItem", position: 2, name: title, item: url },
            ],
          },
          {
            "@type": "CollectionPage",
            name: title,
            description,
            url,
            inLanguage: "en",
            isPartOf: { "@id": WEBSITE_ID },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: entries.length,
              itemListElement: entries.map((entry, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: entry.meta.title,
                description: entry.meta.subtitle,
                url: `${SITE_URL}${entryPath(entry.contentType, entry.slug)}`,
              })),
            },
          },
        ],
      }}
    />
  )
}
