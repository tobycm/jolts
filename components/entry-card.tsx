import Link from "next/link"

import { Clock, Coins } from "@phosphor-icons/react/dist/ssr"

import { CheckerFrame } from "@/components/checker-frame"
import { contentImageHasAlpha } from "@/lib/content-image"
import {
  authors,
  contentImageUrl,
  type GuideMeta,
  type Entry,
  type EntryMeta,
} from "@/lib/content"
import { difficultyLevel, typeTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

/* Hub presentation. Builds are a catalog of equivalent, photo-led items,
   so they earn cards - wearing the same checker frame as the guide header,
   one size down. Concepts and tools are reference pages reached from
   moments of need: they render as a plain list, hairline-divided, like an
   index. */

function DifficultyDots({ meta }: { meta: GuideMeta }) {
  const filled = difficultyLevel[meta.difficulty]
  return (
    <span className="inline-flex items-center gap-[6px] capitalize">
      <span className="flex gap-[2.5px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="size-[6px] rounded-full"
            style={{
              background:
                i <= filled ? typeTheme.guides.accent : "var(--jt-dot-off)",
            }}
          />
        ))}
      </span>
      {meta.difficulty}
    </span>
  )
}

/* The card is packaging, the project is the toy inside it: the same
   checker frame the guide header wears, one size down, with the
   transparent render floating in the white surface's display window.
   Opaque photos fill the window instead. */
export async function GuideCard({ entry }: { entry: Entry<GuideMeta> }) {
  const meta = entry.meta
  const theme = typeTheme.guides
  const heroTransparent = meta.hero
    ? await contentImageHasAlpha(entry.contentType, entry.slug, meta.hero)
    : false

  return (
    <Link href={`/guides/${entry.slug}`} className="group flex flex-col">
      <CheckerFrame
        theme={theme}
        checkerSize={110}
        className="flex flex-1 flex-col shadow-[0px_4px_14px_-2px_rgba(0,0,0,0.18)]"
      >
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-[7px] bg-[var(--jt-surface)]">
          {/* soft accent glow behind the display window */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `radial-gradient(420px 260px at 50% -25%, ${theme.tint}, transparent 72%)`,
            }}
          />

          {/* display window - no clipping of its own, so the render's
              drop-shadow can spill toward the title; the surface below
              still rounds the corners of full-bleed photos */}
          {meta.hero && (
            <div className="relative flex aspect-[16/9] items-center justify-center">
              {heroTransparent ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={contentImageUrl(entry.contentType, entry.slug, meta.hero)}
                  alt=""
                  loading="lazy"
                  className="max-h-[84%] w-[74%] rotate-[-2deg] object-contain [filter:drop-shadow(0px_10px_14px_rgba(0,0,0,0.25))]"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={contentImageUrl(entry.contentType, entry.slug, meta.hero)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>
          )}

          <div
            className={cn(
              "relative flex flex-1 flex-col px-[15px] pb-[13px]",
              meta.hero ? "pt-[2px]" : "pt-[15px]"
            )}
          >
            <h3 className="font-augie text-[21px] leading-[1.15] text-[var(--jt-ink)] group-hover:underline [text-decoration-thickness:1.5px] [text-underline-offset:4px]">
              {meta.title}
            </h3>
            <p className="mt-[4px] line-clamp-2 text-[13.5px] leading-[1.5] tracking-[-0.01em] text-[var(--jt-muted)]">
              {meta.subtitle}
            </p>
            <p className="mt-auto flex flex-wrap items-center gap-x-[11px] gap-y-[4px] pt-[12px] text-[12.5px] tracking-[-0.01em] text-[var(--jt-muted)]">
              <DifficultyDots meta={meta} />
              <span className="inline-flex items-center gap-[5px]">
                <Clock size={13} weight="fill" className="text-[var(--jt-faint)]" aria-hidden />
                {meta.time}
              </span>
              <span className="inline-flex items-center gap-[5px]">
                <Coins size={13} weight="fill" className="text-[var(--jt-faint)]" aria-hidden />
                {meta.cost}
              </span>
            </p>
          </div>
        </div>
      </CheckerFrame>
    </Link>
  )
}

/* Concepts and tools: an index list, not a card grid. */
export function EntryList({ entries }: { entries: Entry[] }) {
  return (
    <ul className="divide-y divide-[var(--jt-line-soft)]">
      {entries.map((entry) => {
        const meta = entry.meta as EntryMeta
        return (
          <li key={entry.slug}>
            <Link
              href={`/${entry.contentType}/${entry.slug}`}
              className="group flex flex-wrap items-baseline gap-x-[12px] gap-y-[2px] py-[13px]"
            >
              <span className="text-[16.5px] font-semibold tracking-[-0.02em] text-[var(--jt-ink)] group-hover:underline [text-decoration-thickness:1.5px] [text-underline-offset:3px]">
                {meta.title}
              </span>
              <span className="min-w-0 flex-1 text-[13.5px] tracking-[-0.01em] text-[var(--jt-muted)]">
                {meta.subtitle}
              </span>
              {"cost" in meta && meta.cost && (
                <span className="shrink-0 text-[13px] tracking-[-0.01em] text-[var(--jt-faint)] tabular-nums">
                  {meta.cost}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://github.com/${name}.png?size=48`}
      alt=""
      width={22}
      height={22}
      loading="lazy"
      className="size-[22px] rounded-full border-2 border-[var(--jt-mount)] bg-[var(--jt-fill)]"
    />
  )
}

export function AuthorLine({ meta }: { meta: EntryMeta }) {
  const names = authors(meta)
  if (names.length === 0) return null
  return (
    <span className="inline-flex items-center gap-[7px] text-[13px] tracking-[-0.01em] text-[var(--jt-muted)]">
      by
      <span className="flex -space-x-[6px]">
        {names.map((name) => (
          <Avatar key={name} name={name} />
        ))}
      </span>
      <span>
        {names.map((name, i) => (
          <span key={name}>
            {i > 0 && ", "}
            <a
              href={`https://github.com/${name}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--jt-body)] hover:underline [text-underline-offset:3px]"
            >
              @{name}
            </a>
          </span>
        ))}
      </span>
    </span>
  )
}

/* everyone who improved the guide after the author - avatar stack only,
   names on hover */
export function ContributorsLine({ names }: { names: string[] }) {
  if (names.length === 0) return null
  return (
    <span className="inline-flex items-center gap-[8px] text-[13px] tracking-[-0.01em] text-[var(--jt-muted)]">
      Contributors
      <span className="flex -space-x-[6px]">
        {names.map((name) => (
          <a
            key={name}
            href={`https://github.com/${name}`}
            target="_blank"
            rel="noreferrer"
            title={`@${name}`}
            className="transition-transform duration-150 hover:-translate-y-[2px]"
          >
            <Avatar name={name} />
          </a>
        ))}
      </span>
    </span>
  )
}
