import type { NextConfig } from "next";

/* The pages that have a raw-markdown twin. Only entries have one - a
   guide's .md is the whole book, chapters included - so chapter URLs
   are deliberately absent from both lists below.

   `alternate` is the public .md URL we advertise; `markdown` is the
   internal route that renders it (see app/md/[type]/[slug]/route.ts). */
const MARKDOWN_TWINS = [
  { source: "/", alternate: "/index.md", markdown: "/index.md" },
  { source: "/start", alternate: "/start.md", markdown: "/md/pages/start" },
  {
    source: "/guides/:slug",
    alternate: "/guides/:slug.md",
    markdown: "/md/guides/:slug",
  },
  {
    source: "/concepts/:slug",
    alternate: "/concepts/:slug.md",
    markdown: "/md/concepts/:slug",
  },
  {
    source: "/tools/:slug",
    alternate: "/tools/:slug.md",
    markdown: "/md/tools/:slug",
  },
];

const LICENSE = "https://creativecommons.org/licenses/by-sa/4.0/";

/* An Accept header that names markdown at all. Next anchors `has` values
   with ^...$, so the wildcards are load-bearing. No browser sends this. */
const ACCEPTS_MARKDOWN = ".*text/markdown.*";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      /* Content negotiation (acceptmarkdown.com): an agent asking for
         markdown at the canonical URL gets markdown from that same URL.
         These must run beforeFiles - afterFiles never fires for a path
         that already resolves to a page. Paired with `Vary: Accept`
         below so a CDN can't hand the HTML variant to an agent. */
      beforeFiles: MARKDOWN_TWINS.map(({ source, markdown }) => ({
        source,
        has: [{ type: "header" as const, key: "accept", value: ACCEPTS_MARKDOWN }],
        destination: markdown,
      })),
      // /guides/macropad.md → raw markdown (see app/md/[type]/[slug]/route.ts)
      afterFiles: [
        {
          source: "/:type(guides|concepts|tools)/:slug.md",
          destination: "/md/:type/:slug",
        },
        // page entries are top-level, so /start.md has no type segment
        {
          source: "/:slug(start).md",
          destination: "/md/pages/:slug",
        },
      ],
      fallback: [],
    };
  },
  /* RFC 8288 link relations, so an agent learns where the sitemap and the
     markdown twin live from the response headers alone - no HTML parse.
     Vary must list Accept wherever the body depends on it. */
  async headers() {
    return MARKDOWN_TWINS.map(({ source, alternate }) => ({
      source,
      headers: [
        {
          key: "Link",
          value: [
            `<${alternate}>; rel="alternate"; type="text/markdown"`,
            `</sitemap.xml>; rel="sitemap"`,
            `<${LICENSE}>; rel="license"`,
          ].join(", "),
        },
        { key: "Vary", value: "Accept" },
      ],
    }));
  },
  // the section used to be called "builds" — old links keep working
  async redirects() {
    return [
      {
        source: "/builds/:path*",
        destination: "/guides/:path*",
        permanent: true,
      },
    ];
  },
  // content/ is read with fs at runtime by the content-images route,
  // so it must ship in the serverless bundle on Vercel
  outputFileTracingIncludes: {
    "/content-images/[...path]": ["./content/**/*"],
  },
};

export default nextConfig;
