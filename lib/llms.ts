import { CONTENT_TYPES, entryPath, listEntries } from "@/lib/content"
import { SITE_URL } from "@/lib/site"

/* The machine-readable site index: every entry with its raw-markdown URL.
   Served verbatim at /llms.txt and /index.md. */

export function llmsIndex(): string {
  const lines: string[] = [
    "# Jolts",
    "",
    "> Hack Club's platform for learning to build hardware: project guides",
    "> (builds), concept explainers, and tool documentation, cross-linked.",
    "> Community-written, PR-reviewed. Text/images CC BY-SA 4.0, code MIT.",
    "",
    `Every page below is also available as raw markdown by appending .md`,
    "",
  ]
  for (const type of CONTENT_TYPES) {
    const entries = listEntries(type)
    if (entries.length === 0) continue
    lines.push(`## ${type[0].toUpperCase()}${type.slice(1)}`, "")
    for (const e of entries) {
      lines.push(
        `- [${e.meta.title}](${SITE_URL}${entryPath(type, e.slug)}.md): ${e.meta.subtitle}`
      )
    }
    lines.push("")
  }
  return lines.join("\n")
}
