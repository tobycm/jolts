import { getMDXComponents, Step } from "@/components/mdx/registry"
import { schemaByType, type ContentType, type EntryMeta } from "@/lib/content-schema"
import type { Entry } from "@/lib/content"
import { splitFrontmatter } from "@/lib/editor/frontmatter"
import { parseMdxDoc } from "@/lib/editor/mdx-parse"
import type { PMNode } from "@/lib/editor/pm-doc"

/* Renders a pull request's MDX the way the site will render it, so a curator
   sees the page instead of a patch. A server component, rendered inside an
   iframe on the review page.

   It deliberately does NOT use lib/mdx.tsx. That path calls @mdx-js/mdx's
   `evaluate()`, which compiles MDX to JavaScript and runs it - fine for content
   already merged into the repo, unacceptable for a file a stranger just pushed,
   because this runs on a server holding a curator's GitHub token.

   Instead the MDX goes through the editor's parser, which is pure mdast: it
   produces plain JSON in a closed vocabulary and turns anything it doesn't
   recognise into an inert block. That JSON is then walked into the real registry
   components, so nothing is evaluated and the output still looks like the site. */

export type PreviewResult =
  | { ok: true; body: React.ReactNode; meta: EntryMeta }
  | { ok: false; error: string }

export function renderPreview(opts: {
  mdx: string
  contentType: ContentType
  slug: string
  /** photos in an open pull request aren't on the deployed site yet, so
      colocated images resolve through the review proxy instead */
  prNumber: number
  sourceFile: string
}): PreviewResult {
  const { data, body } = splitFrontmatter(opts.mdx)

  /* A page's own frontmatter is only present on index.mdx. Sub-pages carry just
     a title, so they borrow a minimal meta - enough for the components that
     read it (PartsList, ShipIt) to render without inventing content. */
  const parsed = schemaByType[opts.contentType].safeParse(data)
  const meta = (parsed.success ? parsed.data : fallbackMeta(opts.contentType, data)) as EntryMeta

  const entry: Entry = {
    slug: opts.slug,
    contentType: opts.contentType,
    meta,
    body,
  }

  let doc: PMNode
  try {
    doc = parseMdxDoc(body).doc
  } catch (err) {
    return { ok: false, error: `This MDX doesn't parse: ${(err as Error).message}` }
  }

  /* The registry resolves colocated images against the deployed site, which
     doesn't have this pull request's new photos yet. Step carries the bulk of a
     guide's photography, so it is re-wrapped to go through the proxy; inline
     images are resolved in the walker below. */
  const proxy = (src: string) =>
    src.startsWith("./")
      ? `/api/review/pr/${opts.prNumber}/image?path=${encodeURIComponent(
          `content/${opts.contentType}/${opts.slug}/${src.slice(2)}`
        )}`
      : src

  const base = getMDXComponents(entry, opts.sourceFile)
  const components: Components = {
    ...base,
    Step: (props: { image?: string; title: string; alt?: string; children?: React.ReactNode }) => (
      <Step {...props} image={props.image ? proxy(props.image) : undefined} />
    ),
  }

  return {
    ok: true,
    body: (doc.content ?? []).map((node, i) => renderNode(node, i, components, proxy)),
    meta,
  }
}

function fallbackMeta(contentType: ContentType, data: Record<string, unknown>) {
  const title = typeof data.title === "string" ? data.title : "Untitled"
  const base = {
    title,
    subtitle: typeof data.subtitle === "string" ? data.subtitle : "",
    contributors: [],
    aliases: [],
    tags: [],
    draft: false,
  }
  if (contentType === "guides") {
    return {
      ...base,
      type: "guide",
      build: true,
      difficulty: "beginner",
      time: "",
      cost: "",
      soldering: false,
      learns: [],
      parts: [],
      tools: [],
    }
  }
  if (contentType === "pages") return { ...base, type: "page" }
  return { ...base, type: contentType === "tools" ? "tool" : "concept" }
}

/* ---------- PM JSON → React ---------- */

type Components = ReturnType<typeof getMDXComponents>
/** The registry's components take their own prop shapes; the walker only knows
    "node attrs in, element out", so it addresses them structurally. */
type AnyComponent = React.ComponentType<Record<string, unknown>>

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const

type Proxy = (src: string) => string

/* The site doesn't style prose with a CSS class - getMDXComponents supplies
   styled h2/p/ul/a/code/... through the same map as the block components. The
   walker has to go through it, or the preview renders as browser-default serif
   and looks nothing like the page. */
function el(components: Components, tag: string): React.ElementType {
  const map = components as unknown as Record<string, React.ElementType | undefined>
  // the fallback is a plain intrinsic tag name, which only the cast can express
  return map[tag] ?? (tag as unknown as React.ElementType)
}

function children(
  node: PMNode,
  components: Components,
  proxy: Proxy
): React.ReactNode {
  return (node.content ?? []).map((child, i) => renderNode(child, i, components, proxy))
}

function renderNode(
  node: PMNode,
  key: number,
  components: Components,
  proxy: Proxy
): React.ReactNode {
  const attrs = (node.attrs ?? {}) as Record<string, unknown>
  const C = components as unknown as Record<string, AnyComponent>

  switch (node.type) {
    /* ---- prose ---- */
    case "text":
      return renderText(node, key, components)
    case "hardBreak":
      return <br key={key} />
    case "paragraph": {
      const P = el(components, "p")
      return <P key={key}>{children(node, components, proxy)}</P>
    }
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(attrs.level ?? 2)))
      const H = el(components, HEADINGS[level - 1])
      return <H key={key}>{children(node, components, proxy)}</H>
    }
    case "bulletList": {
      const Ul = el(components, "ul")
      return <Ul key={key}>{children(node, components, proxy)}</Ul>
    }
    case "orderedList": {
      const Ol = el(components, "ol")
      return <Ol key={key}>{children(node, components, proxy)}</Ol>
    }
    case "listItem": {
      const Li = el(components, "li")
      return <Li key={key}>{children(node, components, proxy)}</Li>
    }
    case "blockquote": {
      const Bq = el(components, "blockquote")
      return <Bq key={key}>{children(node, components, proxy)}</Bq>
    }
    case "horizontalRule": {
      const Hr = el(components, "hr")
      return <Hr key={key} />
    }
    case "codeBlock": {
      const Pre = el(components, "pre")
      const Code = el(components, "code")
      return (
        <Pre key={key}>
          <Code className={attrs.language ? `language-${String(attrs.language)}` : undefined}>
            {plainText(node)}
          </Code>
        </Pre>
      )
    }
    case "image": {
      const Img = el(components, "img")
      return (
        <Img key={key} src={proxy(String(attrs.src ?? ""))} alt={String(attrs.alt ?? "")} />
      )
    }

    /* ---- tables ---- */
    case "table": {
      const Table = el(components, "table")
      return (
        <Table key={key}>
          <tbody>{children(node, components, proxy)}</tbody>
        </Table>
      )
    }
    case "tableRow":
      return <tr key={key}>{children(node, components, proxy)}</tr>
    case "tableHeader":
      return <th key={key}>{children(node, components, proxy)}</th>
    case "tableCell":
      return <td key={key}>{children(node, components, proxy)}</td>

    /* ---- the block registry ---- */
    case "step":
      return renderComponent(C.Step, key, attrs, children(node, components, proxy))
    case "warning":
      return renderComponent(C.Warning, key, attrs, children(node, components, proxy))
    case "checkpoint":
      return renderComponent(C.Checkpoint, key, attrs, children(node, components, proxy))
    case "shipIt":
      return renderComponent(C.ShipIt, key, attrs, children(node, components, proxy))
    case "readMore":
      return renderComponent(C.ReadMore, key, attrs, children(node, components, proxy))
    case "externalGuide":
      return renderComponent(C.ExternalGuide, key, attrs, children(node, components, proxy))
    case "partsList":
      return renderComponent(C.PartsList, key, attrs, null)
    case "schematic":
      return renderComponent(C.Schematic, key, attrs, null)
    case "video":
      return renderComponent(C.Video, key, attrs, null)
    case "pinTable":
      return renderComponent(C.PinTable, key, attrs, null)
    case "difficulty":
      return renderComponent(C.Difficulty, key, attrs, null)
    case "conceptLink":
      return renderComponent(C.ConceptLink, key, attrs, children(node, components, proxy))
    case "toolLink":
      return renderComponent(C.Tool, key, attrs, children(node, components, proxy))

    /* ---- things the editor keeps but can't style ---- */
    case "mdxComment":
      return null
    case "rawInline":
      return <code key={key}>{String(attrs.value ?? "")}</code>
    case "rawMdx":
      return (
        <pre key={key} data-jolts-raw="">
          <code>{String(attrs.value ?? "")}</code>
        </pre>
      )
    default:
      // unknown block: show it rather than silently dropping content
      return (
        <p key={key} data-jolts-unknown={node.type}>
          {plainText(node)}
        </p>
      )
  }
}

function renderComponent(
  Component: AnyComponent | undefined,
  key: number,
  attrs: Record<string, unknown>,
  inner: React.ReactNode
): React.ReactNode {
  if (!Component) return null
  const props: Record<string, unknown> = { ...attrs }
  if (inner) props.children = inner
  return <Component key={key} {...props} />
}

/** Text with its marks nested back on, outermost first. */
function renderText(
  node: PMNode,
  key: number,
  components: Components
): React.ReactNode {
  let out: React.ReactNode = node.text ?? ""
  for (const mark of [...(node.marks ?? [])].reverse()) {
    const a = (mark.attrs ?? {}) as Record<string, unknown>
    switch (mark.type) {
      case "bold":
        out = <strong>{out}</strong>
        break
      case "italic":
        out = <em>{out}</em>
        break
      case "strike":
        out = <del>{out}</del>
        break
      case "code": {
        const Code = el(components, "code")
        out = <Code>{out}</Code>
        break
      }
      case "kbd":
        out = <kbd>{out}</kbd>
        break
      case "link": {
        const A = el(components, "a")
        out = (
          <A href={String(a.href ?? "#")} title={a.title ? String(a.title) : undefined}>
            {out}
          </A>
        )
        break
      }
      default:
        break
    }
  }
  return <span key={key}>{out}</span>
}

function plainText(node: PMNode): string {
  if (node.text) return node.text
  return (node.content ?? []).map(plainText).join("")
}
