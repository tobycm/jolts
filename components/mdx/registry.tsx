import {
  ArrowUpRight,
  CheckCircle,
  Lightbulb,
  Package,
  PencilSimple,
  RocketLaunch,
  Warning as WarningIcon,
  Wrench,
} from "@phosphor-icons/react/dist/ssr"
import type { MDXComponents } from "mdx/types"

import {
  CheckerFrame,
  FlagFrame,
  type FrameTheme,
} from "@/components/checker-frame"
import { GuideCard } from "@/components/entry-card"
import { PreviewLink, type PreviewTheme } from "@/components/preview-link"
import { ToolkitPicker } from "@/components/mdx/toolkit-picker"
import { App, AppGroup } from "@/components/mdx/app-logo"
import {
  contentImageUrl,
  getEntry,
  listGuides,
  plainExcerpt,
  slugifyHeading,
  type Entry,
  type GuideMeta,
} from "@/lib/content"
import { typeTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

/* The closed component registry. Authors never write arbitrary JSX - these
   ~12 blocks are the whole vocabulary, which keeps guides consistent and
   makes a WYSIWYG editor possible (each block round-trips as a form).

   Design intent (Read surface): the article is typography and whitespace.
   Grouping comes from proximity and hairlines, not containers - the only
   tinted surfaces are Warning/Checkpoint (they signal state) and the one
   loud moment at the end (ShipIt). Cross-links carry Wikipedia-style
   hover previews baked in at build time.

   Everything except PreviewLink and ToolkitPicker is a server component:
   guides ship almost zero client JS. Blocks are bound per-entry (getMDXComponents) so they can
   read frontmatter, resolve relative images, and inherit the content type's
   accent via --guide-accent on the article wrapper. */

/* ---------- Step - the iFixit-style unit of instruction ---------- */

/* pen-on-hover for section headings - opens the page in the visual editor */
function EditPen({ editUrl, className }: { editUrl?: string; className?: string }) {
  if (!editUrl) return null
  return (
    <a
      href={editUrl}
      aria-label="Edit this page in the visual editor"
      className={cn(
        "text-[var(--jt-fainter)] opacity-0 transition-opacity duration-150 group-hover/heading:opacity-100 hover:!text-[var(--jt-ink)]",
        className
      )}
    >
      <PencilSimple size={16} weight="bold" aria-hidden />
    </a>
  )
}

/* the # that hangs in the left margin of a heading on hover - a link to the
   heading's own anchor, in the content type's accent (orange/purple/green
   via --guide-accent). The heading it sits in must be `relative group/heading`.
   Absolute so it never shifts the heading text; hidden until hover, and on
   touch (no hover) it simply never shows. */
function AnchorLink({ id }: { id: string }) {
  return (
    <a
      href={`#${id}`}
      aria-label="Link to this section"
      className="absolute top-0 right-full mr-[8px] font-normal opacity-0 transition-opacity duration-150 select-none group-hover/heading:opacity-100 hover:!opacity-100"
      style={{ color: "var(--guide-accent, var(--jt-guides-accent))" }}
    >
      #
    </a>
  )
}

export function Step({
  title,
  image,
  alt,
  editUrl,
  children,
}: {
  title: string
  image?: string
  alt?: string
  editUrl?: string
  children?: React.ReactNode
}) {
  return (
    <section
      id={slugifyHeading(title)}
      className="jolts-step mt-[40px] scroll-mt-[24px]"
    >
      {/* the step heading is one two-segment tab: "Step N" in the guide
          accent with the tilted flag edge, continuing into a grey segment
          that carries the title */}
      {/* isolate: keeps the flag's z-10 from painting over floating UI */}
      <h3 className="group/heading relative isolate flex items-stretch text-[17px] font-semibold tracking-[-0.03em]">
        <AnchorLink id={slugifyHeading(title)} />
        {/* accent segment: the body's right edge is clipped diagonally so
            nothing can leak past the seam, and a skewed rounded cap rides
            the same diagonal (outside the clipped span - clip-path clips
            children) to keep the flag tip fluid */}
        <span aria-hidden className="relative z-10 flex shrink-0">
          <span
            className="absolute top-0 right-[4px] h-full w-[18px] -skew-x-[16deg] rounded-r-[7px]"
            style={{ background: "var(--guide-accent, var(--jt-chrome-accent))" }}
          />
          <span
            className="relative flex items-center gap-[4px] rounded-l-[8px] py-[5px] pr-[15px] pl-[13px] text-[13px] tracking-[-0.02em] text-[var(--jt-on-accent)]"
            style={{
              background: "var(--guide-accent, var(--jt-chrome-accent))",
              clipPath:
                "polygon(0 0, calc(100% - 9px) 0, calc(100% - 18px) 100%, 0 100%)",
            }}
          >
            <span>Step</span>
            <span className="jolts-step-num tabular-nums" />
          </span>
        </span>
        <span className="-ml-[20px] min-w-0 rounded-r-[8px] bg-[var(--jt-fill)] py-[5px] pr-[16px] pl-[30px] text-[var(--jt-ink)]">
          {title}
        </span>
        <EditPen editUrl={editUrl} className="ml-auto self-center pl-[10px]" />
      </h3>
      <div
        className={cn(
          "mt-[14px] grid gap-x-[26px] gap-y-[14px]",
          image ? "sm:grid-cols-[minmax(0,44%)_minmax(0,1fr)]" : ""
        )}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={alt ?? title}
            loading="lazy"
            className="!my-0 aspect-[4/3] w-full rounded-[8px] border border-[var(--jt-line)] object-cover"
          />
        )}
        <div className="jolts-step-body min-w-0 text-[15.5px] leading-[1.65] tracking-[-0.01em]">
          {children}
        </div>
      </div>
    </section>
  )
}

/* ---------- PartsList - renders from the guide's frontmatter ---------- */

function PartsListFor({ entry }: { entry: Entry }) {
  if (entry.meta.type !== "guide") return null
  const meta = entry.meta as GuideMeta
  const theme = typeTheme[entry.contentType]
  return (
    <CheckerFrame theme={theme} className="my-[36px]" checkerSize={150}>
      <div className="relative rounded-[7px] bg-[var(--jt-surface)] px-[15px] py-[13px]">
      <div className="flex items-baseline justify-between pb-[12px]">
        <h3 className="!m-0 flex items-center gap-[9px] text-[17px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
          <Package size={19} weight="fill" style={{ color: theme.accent }} aria-hidden />
          What you need
        </h3>
        <span className="text-[13.5px] tracking-[-0.01em] text-[var(--jt-muted)]">
          {meta.cost} total
        </span>
      </div>
      <ul className="!m-0 grid !list-none grid-cols-1 gap-[10px] !p-0 sm:grid-cols-2">
        {meta.parts.map((part) => {
          const inner = (
            <>
              {part.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={contentImageUrl(entry.contentType, entry.slug, part.image)}
                  alt=""
                  loading="lazy"
                  className="!my-0 size-[54px] shrink-0 rounded-[8px] border border-[var(--jt-line)] bg-[var(--jt-surface)] object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex size-[54px] shrink-0 items-center justify-center rounded-[8px] bg-[var(--jt-fill)]"
                >
                  <Package size={22} weight="duotone" className="text-[var(--jt-fainter)]" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-[6px] text-[14.5px] leading-[1.3] font-semibold tracking-[-0.02em] text-[var(--jt-ink)]">
                  <span className="truncate">{part.name}</span>
                  {part.link && (
                    <ArrowUpRight
                      size={11}
                      weight="bold"
                      className="shrink-0 self-center text-[var(--jt-faint)] transition-colors group-hover/part:text-[var(--jt-ink)]"
                      aria-hidden
                    />
                  )}
                </span>
                {part.note && (
                  <span className="mt-[1px] block truncate text-[12.5px] tracking-[-0.01em] text-[var(--jt-faint)]">
                    {part.note}
                  </span>
                )}
                <span className="mt-[3px] block text-[12.5px] tracking-[-0.01em] text-[var(--jt-muted)] tabular-nums">
                  {part.qty}×{part.cost && <span className="text-[var(--jt-faint)]"> · {part.cost}</span>}
                </span>
              </span>
            </>
          )
          const tileClass =
            "group/part !m-0 flex items-center gap-[12px] rounded-[10px] border border-[var(--jt-line)] p-[9px]"
          return (
            <li key={part.name} className="!m-0 contents">
              {part.link ? (
                <a
                  href={part.link}
                  target="_blank"
                  rel="noreferrer"
                  className={
                    tileClass +
                    " bg-[var(--jt-surface)] no-underline transition-colors duration-150 hover:border-[var(--jt-line-hover)]"
                  }
                >
                  {inner}
                </a>
              ) : (
                <span className={tileClass + " bg-[var(--jt-surface)]"}>{inner}</span>
              )}
            </li>
          )
        })}
      </ul>
      </div>
    </CheckerFrame>
  )
}

/* ---------- cross-link chips with hover previews ---------- */

/* Chips are the linking discipline made visible in the prose, and the
   hover pane wears the navigation dropdown's checker chrome in the
   destination type's family. */

const conceptPreviewTheme: PreviewTheme = {
  accent: "var(--jt-concepts-accent)",
  frame: "var(--jt-concepts-frame)",
  checkerA: "var(--jt-concepts-checker-a)",
  checkerB: "var(--jt-concepts-checker-b)",
  wash: "var(--jt-concepts-wash)",
  chipBg: "var(--jt-concepts-chip)",
  chipText: "var(--jt-concepts-chip-ink)",
  chipHoverBg: "var(--jt-concepts-chip-hover)",
}

const toolPreviewTheme: PreviewTheme = {
  accent: "var(--jt-tools-accent)",
  frame: "var(--jt-tools-frame)",
  checkerA: "var(--jt-tools-checker-a)",
  checkerB: "var(--jt-tools-checker-b)",
  wash: "var(--jt-tools-wash)",
  chipBg: "var(--jt-tools-chip)",
  chipText: "var(--jt-tools-chip-ink)",
  chipHoverBg: "var(--jt-tools-chip-hover)",
}

/* The guide catalog, inline. Site pages ("Start here") need to hand the
   reader the actual builds, not a link to them; sort="easiest" leads with
   the ones that need no soldering, and only="builds" drops the general
   guides that don't end in a finished object. */
async function GuideGrid({
  sort,
  only,
}: {
  sort?: "easiest"
  only?: "builds"
}) {
  const all =
    only === "builds" ? listGuides().filter((g) => g.meta.build) : listGuides()
  const guides =
    sort === "easiest"
      ? [...all].sort(
          (a, b) =>
            Number(a.meta.soldering) - Number(b.meta.soldering) ||
            a.meta.title.localeCompare(b.meta.title)
        )
      : all
  return (
    <div className="my-[28px] grid grid-cols-1 gap-[18px] sm:grid-cols-2">
      {guides.map((entry) => (
        <GuideCard key={entry.slug} entry={entry} />
      ))}
    </div>
  )
}

function ConceptLinkInline({
  slug,
  children,
}: {
  slug: string
  children?: React.ReactNode
}) {
  const concept = getEntry("concepts", slug)
  if (!concept) return <span>{children ?? slug}</span>
  return (
    <PreviewLink
      href={`/concepts/${concept.slug}`}
      theme={conceptPreviewTheme}
      icon={<Lightbulb size={14} weight="fill" aria-hidden />}
      kindLabel="Concept"
      title={concept.meta.title}
      excerpt={plainExcerpt(concept.body)}
    >
      {children ?? concept.meta.title}
    </PreviewLink>
  )
}

function ToolLinkInline({
  slug,
  children,
}: {
  slug: string
  children?: React.ReactNode
}) {
  const tool = getEntry("tools", slug)
  if (!tool) return <span>{children ?? slug}</span>
  const cost = tool.meta.type === "tool" ? tool.meta.cost : undefined
  return (
    <PreviewLink
      href={`/tools/${tool.slug}`}
      theme={toolPreviewTheme}
      icon={<Wrench size={14} weight="fill" aria-hidden />}
      kindLabel="Tool"
      title={tool.meta.title}
      excerpt={plainExcerpt(tool.body)}
      meta={cost ? `Costs about ${cost}` : undefined}
    >
      {children ?? tool.meta.title}
    </PreviewLink>
  )
}

/* ---------- Warning / Checkpoint - framed, flag on the left ---------- */

/* same family as ShipIt / the Start-here card */
const warningFrame: FrameTheme = {
  frame: "var(--jt-guides-frame)",
  checkerA: "var(--jt-guides-checker-a)",
  checkerB: "var(--jt-guides-checker-b)",
  wash: "var(--jt-guides-wash)",
}

const checkpointFrame: FrameTheme = {
  frame: "var(--jt-check-frame)",
  checkerA: "var(--jt-check-checker-a)",
  checkerB: "var(--jt-check-checker-b)",
  wash: "var(--jt-check-wash)",
}

export function Warning({
  title = "Careful",
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <aside className="my-[30px]">
      <FlagFrame
        theme={warningFrame}
        label={title}
        icon={<WarningIcon size={15} weight="fill" aria-hidden />}
      >
        <div className="jolts-tight text-[14.5px] leading-[1.6] tracking-[-0.01em] text-[var(--jt-muted)]">
          {children}
        </div>
      </FlagFrame>
    </aside>
  )
}

export function Checkpoint({
  title = "Checkpoint",
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <aside className="my-[30px]">
      <FlagFrame
        theme={checkpointFrame}
        label={title}
        icon={<CheckCircle size={15} weight="fill" aria-hidden />}
      >
        <div className="jolts-tight text-[14.5px] leading-[1.6] tracking-[-0.01em] text-[var(--jt-muted)]">
          {children}
        </div>
      </FlagFrame>
    </aside>
  )
}

/* ---------- Schematic / figure ---------- */

function SchematicFor({
  entry,
  src,
  alt,
  caption,
}: {
  entry: Entry
  src: string
  alt: string
  caption?: string
}) {
  return (
    <figure className="my-[30px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={contentImageUrl(entry.contentType, entry.slug, src)}
        alt={alt}
        loading="lazy"
        className="!my-0 w-full rounded-[8px] border border-[var(--jt-line)] bg-[var(--jt-surface)]"
      />
      {caption && (
        <figcaption className="mt-[8px] text-[13px] tracking-[-0.01em] text-[var(--jt-faint)]">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

/* ---------- Video (YouTube embed) ---------- */

export function Video({ id, title }: { id: string; title: string }) {
  return (
    <div className="my-[30px]">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-[8px] border border-[var(--jt-line)]"
      />
    </div>
  )
}

/* ---------- PinTable ---------- */

export function PinTable({
  pins,
  children,
}: {
  pins?: { pin: string; signal: string; note?: string }[]
  children?: React.ReactNode
}) {
  if (!pins) return <div className="jolts-pintable">{children}</div>
  return (
    <table className="my-[30px] w-full border-collapse text-[14px] tracking-[-0.01em]">
      <thead>
        <tr className="border-b border-[var(--jt-line)] text-left text-[12.5px] font-semibold tracking-[0.01em] text-[var(--jt-faint)] uppercase">
          <th className="py-[7px] pr-[16px] font-semibold">Pin</th>
          <th className="py-[7px] pr-[16px] font-semibold">Connects to</th>
          <th className="py-[7px] font-semibold">Why</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--jt-line-soft)]">
        {pins.map((p) => (
          <tr key={p.pin + p.signal}>
            <td className="py-[8px] pr-[16px] font-mono text-[13px] font-medium text-[var(--jt-ink)]">
              {p.pin}
            </td>
            <td className="py-[8px] pr-[16px] text-[var(--jt-ink)]">{p.signal}</td>
            <td className="py-[8px] text-[var(--jt-muted)]">{p.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ---------- Difficulty (inline chip, also used in page headers) ---------- */

export function Difficulty({
  level,
}: {
  level: "beginner" | "intermediate" | "advanced"
}) {
  const filled = { beginner: 1, intermediate: 2, advanced: 3 }[level]
  return (
    <span className="inline-flex items-center gap-[7px] text-[14px] tracking-[-0.01em] text-[var(--jt-muted)] capitalize">
      <span className="flex gap-[3px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="size-[7px] rounded-full"
            style={{
              background:
                i <= filled ? "var(--guide-accent, var(--jt-guides-accent))" : "var(--jt-dot-off)",
            }}
          />
        ))}
      </span>
      {level}
    </span>
  )
}

/* ---------- ReadMore + ExternalGuide - further reading, done elegantly ---------- */

/* Jolts is the front door, not the whole library - deep dives link out.
   Wrap the guide-end links in <ReadMore>; a lone <ExternalGuide> mid-article
   works too. */

export function ReadMore({ children }: { children: React.ReactNode }) {
  return (
    <aside className="mt-[44px]">
      <div className="flex items-center gap-[14px]">
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
          Read more
        </h2>
        <span aria-hidden className="h-px flex-1 bg-black/10" />
      </div>
      <div className="mt-[12px] flex flex-col gap-[8px] [&>*]:!my-0">
        {children}
      </div>
    </aside>
  )
}

export function ExternalGuide({
  href,
  title,
  source,
  children,
}: {
  href: string
  title: string
  source?: string
  children?: React.ReactNode
}) {
  let domain = source
  if (!domain) {
    try {
      domain = new URL(href).hostname.replace(/^www\./, "")
    } catch {
      domain = href
    }
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group my-[26px] block rounded-[10px] border border-[var(--jt-line)] bg-[var(--jt-raise)] px-[15px] py-[11px] no-underline transition-colors duration-150 hover:border-[var(--jt-line-hover)] hover:bg-[var(--jt-raise-hover)]"
    >
      <span className="flex items-baseline gap-[8px] text-[15px] tracking-[-0.01em]">
        <span className="font-semibold text-[var(--jt-ink)]">{title}</span>
        <span className="text-[13px] text-[var(--jt-faint)]">· {domain}</span>
        <ArrowUpRight
          size={14}
          weight="bold"
          className="ml-auto shrink-0 self-center text-[var(--jt-faint)] transition-transform duration-150 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] group-hover:text-[var(--jt-ink)]"
          aria-hidden
        />
      </span>
      <span className="jolts-tight mt-[2px] block text-[13.5px] leading-[1.55] tracking-[-0.01em] text-[var(--jt-muted)] [&_p]:!text-[13.5px] [&_p]:!leading-[1.55]">
        {children ?? `More on ${domain}.`}
      </span>
    </a>
  )
}

/* ---------- ShipIt - the page's one loud moment ---------- */

function ShipItFor({ entry, children }: { entry: Entry; children?: React.ReactNode }) {
  const theme = typeTheme[entry.contentType]
  return (
    <aside
      className="relative mt-[48px] overflow-hidden rounded-[12px] p-[6px]"
      style={{ background: theme.accent }}
    >
      {/* rotated checkerboard chrome, same family as the header */}
      <div
        aria-hidden
        className="absolute -inset-[60%] rotate-[-12deg]"
        style={{
          backgroundImage: `conic-gradient(${theme.checkerA} 0 25%, ${theme.checkerB} 0 50%, ${theme.checkerA} 0 75%, ${theme.checkerB} 0)`,
          backgroundSize: "150px 150px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(${theme.wash},0) 0%, rgba(${theme.wash},0.55) 100%)`,
        }}
      />
      <div className="relative rounded-[7px] bg-[var(--jt-surface)] px-[22px] py-[18px]">
        <p className="!m-0 flex items-center gap-[9px] text-[20px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
          <RocketLaunch size={22} weight="fill" style={{ color: theme.accent }} aria-hidden />
          Ship it!
        </p>
        <div className="jolts-tight mt-[4px] text-[14.5px] leading-[1.6] tracking-[-0.01em] text-[var(--jt-muted)]">
          {children ?? (
            <p>
              Built it? Post a photo in{" "}
              <a
                href="https://hackclub.slack.com/channels/ship"
                className="font-semibold text-[var(--jt-ink)] underline decoration-[var(--jt-line-strong)] underline-offset-[3px] hover:decoration-[var(--jt-ink)]"
              >
                #ship on the Hack Club Slack
              </a>{" "} - and if you changed something, improve this guide with a pull
              request. Your name goes on it.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}

/* ---------- prose defaults for plain markdown ---------- */

/* text content of a heading's children, for stable anchor ids */
function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textOf).join("")
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node.props as { children?: React.ReactNode }).children)
  }
  return ""
}

function proseComponents(entry: Entry, editUrl?: string): MDXComponents {
  return {
    h2: ({ children, ...props }) => {
      const id = slugifyHeading(textOf(children))
      return (
        <h2
          id={id}
          className="group/heading relative mt-[48px] mb-[12px] flex items-baseline gap-[10px] scroll-mt-[24px] text-[26px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]"
          {...props}
        >
          <AnchorLink id={id} />
          <span className="min-w-0">{children}</span>
          <EditPen editUrl={editUrl} className="ml-auto shrink-0 self-center" />
        </h2>
      )
    },
    h3: ({ children, ...props }) => {
      const id = slugifyHeading(textOf(children))
      return (
        <h3
          id={id}
          className="group/heading relative mt-[34px] mb-[8px] scroll-mt-[24px] text-[20px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]"
          {...props}
        >
          <AnchorLink id={id} />
          {children}
        </h3>
      )
    },
    p: (props) => (
      <p
        className="my-[14px] text-[15.5px] leading-[1.7] tracking-[-0.01em] text-[var(--jt-body)]"
        {...props}
      />
    ),
    /* Off-site links open in a new tab, matching ExternalGuide and the
       parts tiles. Site-relative ones don't: a new tab for /tools/... is
       just a second copy of the site. */
    a: ({ href, ...props }) => (
      <a
        href={href}
        {...(href?.startsWith("http")
          ? { target: "_blank", rel: "noreferrer" }
          : null)}
        className="font-medium text-[var(--jt-ink)] underline decoration-[var(--jt-line-strong)] decoration-[1.5px] underline-offset-[3px] transition-colors duration-150 hover:decoration-[var(--jt-ink)]"
        {...props}
      />
    ),
    ul: (props) => (
      <ul
        className="my-[14px] list-disc space-y-[6px] pl-[20px] text-[15.5px] leading-[1.65] tracking-[-0.01em] text-[var(--jt-body)] marker:text-[var(--guide-accent)]"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="my-[14px] list-decimal space-y-[6px] pl-[20px] text-[15.5px] leading-[1.65] tracking-[-0.01em] text-[var(--jt-body)] marker:font-semibold marker:text-[var(--jt-faint)]"
        {...props}
      />
    ),
    code: (props) => (
      <code
        className="rounded-[4px] bg-[var(--jt-code-inline)] px-[5px] py-[1.5px] font-mono text-[0.88em] text-[var(--jt-ink)]"
        {...props}
      />
    ),
    pre: (props) => (
      <pre
        className="my-[20px] overflow-x-auto rounded-[10px] bg-[var(--jt-well)] p-[18px] text-[13.5px] leading-[1.6] text-[var(--jt-well-ink)] [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
        {...props}
      />
    ),
    blockquote: (props) => (
      <blockquote
        className="my-[20px] border-l pl-[16px] text-[var(--jt-muted)] italic"
        style={{ borderColor: "var(--guide-accent)" }}
        {...props}
      />
    ),
    hr: () => <hr className="my-[36px] border-[var(--jt-line)]" />,
    table: (props) => (
      <div className="my-[20px] overflow-x-auto">
        <table
          className="w-full border-collapse text-[14px] tracking-[-0.01em] [&_td]:border-t [&_td]:border-[var(--jt-line-soft)] [&_td]:py-[8px] [&_td]:pr-[16px] [&_th]:border-b [&_th]:border-[var(--jt-line)] [&_th]:py-[7px] [&_th]:pr-[16px] [&_th]:text-left [&_th]:text-[12.5px] [&_th]:font-semibold [&_th]:tracking-[0.01em] [&_th]:text-[var(--jt-faint)] [&_th]:uppercase"
          {...props}
        />
      </div>
    ),
    img: ({ src, alt, ...rest }) => (
      // natural size, never upscaled: small UI screenshots stay small,
      // big photos cap at the column width and a sane height
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contentImageUrl(entry.contentType, entry.slug, String(src ?? ""))}
        alt={alt ?? ""}
        loading="lazy"
        className="my-[20px] block h-auto max-h-[480px] w-auto max-w-full rounded-[8px] border border-[var(--jt-line)]"
        {...rest}
      />
    ),
  }
}

/* ---------- the registry, bound to one guide ---------- */

export function getMDXComponents(
  entry: Entry,
  sourceFile = "index.mdx"
): MDXComponents {
  const editUrl = `/edit/${entry.contentType}/${entry.slug}?page=${sourceFile}`
  return {
    ...proseComponents(entry, editUrl),
    Step: ({ image, ...props }: React.ComponentProps<typeof Step>) => (
      <Step
        {...props}
        editUrl={editUrl}
        image={
          image ? contentImageUrl(entry.contentType, entry.slug, image) : undefined
        }
      />
    ),
    PartsList: () => <PartsListFor entry={entry} />,
    GuideGrid,
    ToolkitPicker,
    Tool: ToolLinkInline,
    Warning,
    Checkpoint,
    Schematic: (props: { src: string; alt: string; caption?: string }) => (
      <SchematicFor entry={entry} {...props} />
    ),
    Video,
    PinTable,
    Difficulty,
    App,
    AppGroup,
    ConceptLink: ConceptLinkInline,
    ExternalGuide,
    ReadMore,
    ShipIt: (props: { children?: React.ReactNode }) => (
      <ShipItFor entry={entry} {...props} />
    ),
  }
}
