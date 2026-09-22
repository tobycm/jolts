import { dump as yamlDump, load as yamlLoad } from "js-yaml"

import type { ContentType, EntryMeta } from "@/lib/content-schema"

/* Frontmatter, both directions, in the house style.

   Parsing uses js-yaml directly (gray-matter drags node builtins into the
   client bundle). Emitting is hand-ordered: keys come out in the same
   order the schema documents them and short string arrays stay inline
   ([a, b]) while parts stay block-style - so an edited frontmatter diffs
   like a human wrote it. An UNCHANGED frontmatter never goes through
   this: the original text is reused verbatim. */

export type SplitFile = { data: Record<string, unknown>; body: string }

export function splitFrontmatter(raw: string): SplitFile {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { data: {}, body: raw }
  const data = (yamlLoad(m[1]) ?? {}) as Record<string, unknown>
  return { data, body: raw.slice(m[0].length) }
}

/* ---------- emitting ---------- */

const KEY_ORDER = [
  "type",
  "build",
  "title",
  "subtitle",
  "seoTitle",
  "seoDescription",
  "author",
  "contributors",
  "difficulty",
  "time",
  "cost",
  "soldering",
  "learns",
  "parts",
  "tools",
  "hero",
  "aliases",
  "tags",
  "updated",
  "draft",
] as const

const PART_KEY_ORDER = ["name", "qty", "cost", "link", "note", "image"] as const

/** Arrays of short strings render inline; parts render as a block list. */
const FLOW_ARRAY_KEYS = new Set([
  "learns",
  "tools",
  "aliases",
  "tags",
  "contributors",
  "author",
])

/** Default-empty keys that stay out of the file entirely when empty. */
const OMIT_WHEN_EMPTY = new Set(["contributors", "aliases", "tags", "tools"])

function scalar(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value !== "string")
    return yamlDump(value, { lineWidth: -1 }).trimEnd()
  // strings: plain when yaml re-reads them unchanged, quoted otherwise
  // (house style also quotes $-and-~ prices like "~$25")
  let plain: unknown
  try {
    plain = yamlLoad(value)
  } catch {
    plain = undefined
  }
  if (
    typeof plain === "string" &&
    plain === value &&
    !value.includes("\n") &&
    !/^[~$]/.test(value)
  ) {
    return value
  }
  // JSON string escaping is a valid YAML double-quoted scalar
  return JSON.stringify(value)
}

function flowArray(values: unknown[]): string {
  return `[${values.map(scalar).join(", ")}]`
}

function partLines(part: Record<string, unknown>): string[] {
  const keys = [
    ...PART_KEY_ORDER.filter((k) => part[k] !== undefined),
    ...Object.keys(part).filter(
      (k) => !(PART_KEY_ORDER as readonly string[]).includes(k)
    ),
  ]
  return keys.map(
    (k, i) => `${i === 0 ? "  - " : "    "}${k}: ${scalar(part[k])}`
  )
}

export function emitFrontmatter(meta: Record<string, unknown>): string {
  const keys = [
    ...KEY_ORDER.filter((k) => meta[k] !== undefined),
    ...Object.keys(meta).filter(
      (k) => !(KEY_ORDER as readonly string[]).includes(k)
    ),
  ]
  const lines: string[] = ["---"]
  for (const key of keys) {
    const value = meta[key]
    if (value === undefined) continue
    if (key === "draft" && value === false) continue
    if (Array.isArray(value)) {
      if (value.length === 0) {
        if (OMIT_WHEN_EMPTY.has(key)) continue
        lines.push(`${key}: []`)
      } else if (key === "parts") {
        lines.push(`${key}:`)
        for (const part of value as Record<string, unknown>[]) {
          lines.push(...partLines(part))
        }
      } else if (FLOW_ARRAY_KEYS.has(key)) {
        lines.push(`${key}: ${flowArray(value)}`)
      } else {
        lines.push(`${key}:`)
        for (const v of value) lines.push(`  - ${scalar(v)}`)
      }
    } else if (key === "author" && typeof value === "string") {
      lines.push(`author: ${scalar(value)}`)
    } else {
      lines.push(`${key}: ${scalar(value)}`)
    }
  }
  lines.push("---")
  return lines.join("\n") + "\n"
}

/** Full file text from meta + body (body already normalized by the
    serializer: no leading blank, single trailing newline). */
export function assembleFile(
  meta: Record<string, unknown>,
  body: string
): string {
  const trimmed = body.replace(/^\n+/, "")
  return emitFrontmatter(meta) + (trimmed ? "\n" + trimmed : "")
}

/** Normalize an entry meta for comparison: zod-parse fills defaults, so
    compare the parsed forms, not raw YAML maps. */
export function metaEquals(
  contentType: ContentType,
  a: EntryMeta,
  b: EntryMeta
): boolean {
  void contentType
  return JSON.stringify(a) === JSON.stringify(b)
}
