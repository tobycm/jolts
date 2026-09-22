import { llmsIndex } from "@/lib/llms"

/* Open-access citizenship from day one: a machine-readable index of every
   guide, each available as raw markdown at <url>.md. Statically generated.
   The same document is served as markdown at /index.md. */

export const dynamic = "force-static"

export function GET() {
  return new Response(llmsIndex(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
