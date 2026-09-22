// Frontmatter validation for content/**/index.mdx - the CI gate that fails
// malformed PRs with a friendly message before anything ships.
// Keep the rules in sync with lib/content-schema.ts (the authoritative
// schemas, which also run during `next build` AND inside the visual
// editor in the browser). This script exists to give
// contributors fast, readable errors instead of a build stack trace.
import fs from "node:fs"
import path from "node:path"

import matter from "gray-matter"
import { z } from "zod"

const CONTENT_DIR = path.join(process.cwd(), "content")
const TYPES = ["guides", "concepts", "tools", "pages"]
// types whose entries are books: index.mdx plus numbered chapters
const BOOK_TYPES = ["guides", "pages"]

const author = z.union([z.string(), z.array(z.string()).min(1)])
const base = {
  title: z.string().min(1),
  subtitle: z.string().min(1),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  author: author.optional(),
  contributors: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  updated: z.union([z.string(), z.date()]).optional(),
  draft: z.boolean().default(false),
  hero: z.string().optional(),
}
const part = z.object({
  name: z.string().min(1),
  qty: z.union([z.number(), z.string()]).default(1),
  cost: z.string().optional(),
  link: z.string().url().optional(),
  note: z.string().optional(),
  image: z.string().optional(),
})
const schemas = {
  guides: z.object({
    ...base,
    type: z.literal("guide"),
    build: z.boolean().default(true),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    time: z.string().min(1),
    cost: z.string().min(1),
    soldering: z.boolean(),
    learns: z.array(z.string()).min(1),
    parts: z.array(part).min(1),
    tools: z.array(z.string()).default([]),
  }),
  concepts: z.object({ ...base, type: z.literal("concept") }),
  pages: z.object({ ...base, type: z.literal("page") }),
  tools: z.object({
    ...base,
    type: z.literal("tool"),
    cost: z.string().optional(),
  }),
}

/* Only the closed registry may appear as JSX - arbitrary components can't
   round-trip through the editor and won't render. */
const REGISTRY = new Set([
  "Step", "PartsList", "Tool", "Warning", "Checkpoint", "Schematic",
  "Video", "PinTable", "Difficulty", "ConceptLink", "ExternalGuide",
  "ReadMore", "ShipIt", "GuideGrid", "ToolkitPicker", "App", "AppGroup",
])

let failures = 0
const fail = (file, msg) => {
  failures++
  console.error(`✗ ${file}\n  ${msg.split("\n").join("\n  ")}\n`)
}

const slugsByType = {}
for (const type of TYPES) {
  const dir = path.join(CONTENT_DIR, type)
  slugsByType[type] = fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : []
}

/* body checks shared by index.mdx and guide page files */
function checkBody(rel, content, type, slug) {
  for (const [, ref] of content.matchAll(/<ConceptLink\s+slug="([^"]+)"/g)) {
    if (!slugsByType.concepts.includes(ref)) {
      fail(rel, `<ConceptLink slug="${ref}"> has no page under content/concepts/`)
    }
  }
  for (const [, ref] of content.matchAll(/<Tool\s+slug="([^"]+)"/g)) {
    if (!slugsByType.tools.includes(ref)) {
      fail(rel, `<Tool slug="${ref}"> has no page under content/tools/`)
    }
  }
  for (const [, tag] of content.matchAll(/<([A-Z][A-Za-z]*)[\s/>]/g)) {
    if (!REGISTRY.has(tag)) {
      fail(rel, `<${tag}> is not in the component registry (${[...REGISTRY].join(", ")})`)
    }
  }
  // colocated images referenced as ./file must exist
  for (const [, img] of content.matchAll(/(?:image|src)="(\.\/[^"]+)"/g)) {
    if (!fs.existsSync(path.join(CONTENT_DIR, type, slug, img.slice(2)))) {
      fail(rel, `referenced image ${img} is not in the guide folder`)
    }
  }
}

for (const type of TYPES) {
  for (const slug of slugsByType[type]) {
    const rel = `content/${type}/${slug}/index.mdx`
    const file = path.join(CONTENT_DIR, type, slug, "index.mdx")

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      fail(rel, `folder name "${slug}" must be kebab-case (a-z, 0-9, dashes)`)
    }
    if (!fs.existsSync(file)) {
      fail(rel, "missing index.mdx - every guide folder needs one")
      continue
    }

    let parsed
    try {
      parsed = matter(fs.readFileSync(file, "utf8"))
    } catch (e) {
      fail(rel, `frontmatter did not parse as YAML: ${e.message}`)
      continue
    }

    const result = schemas[type].safeParse(parsed.data)
    if (!result.success) {
      fail(
        rel,
        result.error.issues
          .map((i) => `${i.path.join(".") || "frontmatter"}: ${i.message}`)
          .join("\n")
      )
      continue
    }

    // referential checks: tool slugs and in-body links must resolve
    for (const toolSlug of result.data.tools ?? []) {
      if (!slugsByType.tools.includes(toolSlug)) {
        fail(rel, `tools: "${toolSlug}" has no page under content/tools/`)
      }
    }
    checkBody(rel, parsed.content, type, slug)
    const hero = result.data.hero
    if (hero?.startsWith("./") && !fs.existsSync(path.join(CONTENT_DIR, type, slug, hero.slice(2)))) {
      fail(rel, `hero image ${hero} is not in the guide folder`)
    }
    for (const part of result.data.parts ?? []) {
      if (part.image?.startsWith("./") && !fs.existsSync(path.join(CONTENT_DIR, type, slug, part.image.slice(2)))) {
        fail(rel, `part image ${part.image} (${part.name}) is not in the guide folder`)
      }
    }

    // book chapters: numbered siblings, one per stage
    const extraMdx = fs
      .readdirSync(path.join(CONTENT_DIR, type, slug))
      .filter((f) => f.endsWith(".mdx") && f !== "index.mdx")
    for (const pageFile of extraMdx) {
      const pageRel = `content/${type}/${slug}/${pageFile}`
      const m = pageFile.match(/^(\d+)-([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/)
      if (!BOOK_TYPES.includes(type)) {
        fail(pageRel, "only guides and pages may have extra chapters - concepts and tools are single index.mdx files")
        continue
      }
      if (!m) {
        fail(pageRel, `page files must be named NN-kebab-slug.mdx (e.g. 01-soldering.mdx)`)
        continue
      }
      let pageParsed
      try {
        pageParsed = matter(fs.readFileSync(path.join(CONTENT_DIR, type, slug, pageFile), "utf8"))
      } catch (e) {
        fail(pageRel, `frontmatter did not parse as YAML: ${e.message}`)
        continue
      }
      if (typeof pageParsed.data.title !== "string" || !pageParsed.data.title) {
        fail(pageRel, `page frontmatter needs a title (shown in the guide's page list)`)
      }
      checkBody(pageRel, pageParsed.content, type, slug)
    }
  }
}

const total = TYPES.reduce((n, t) => n + slugsByType[t].length, 0)
if (failures) {
  console.error(`${failures} problem(s) across ${total} guide(s).`)
  process.exit(1)
}
console.log(`✓ ${total} guides validated.`)
