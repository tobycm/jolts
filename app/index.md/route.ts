import { llmsIndex } from "@/lib/llms"

/* The llms.txt index under its markdown name, for agents and tooling that
   probe <site>/index.md instead. Statically generated. */

export const dynamic = "force-static"

export function GET() {
  return new Response(llmsIndex(), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  })
}
