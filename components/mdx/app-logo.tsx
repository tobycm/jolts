"use client"

import { useToolkit } from "@/components/mdx/toolkit-context"
import { slugifyHeading } from "@/lib/content-schema"

/* An app on the "what software" page: its icon (in public/app-icons) beside
   its name, with whatever the author writes about it underneath. The icon
   files are shaped to sit bare - transparent logos and pre-rounded app tiles
   - so no frame is drawn.

   When the picker recommends this app, it wears a "Recommended for you" tag
   and the whole block floats to the top of its <AppGroup> (via CSS order, so
   the header and its prose move together and the DOM stays put). `name` is
   the icon-file slug; `title` is the display name. */

const APP_ICON_SLUGS = new Set([
  "kicad",
  "easyeda",
  "circuitpython",
  "thonny",
  "arduino",
  "onshape",
  "fusion",
])

/* The apps for one job, stacked. Only a flex column so a recommended child
   can order itself to the top. */
export function AppGroup({ children }: { children?: React.ReactNode }) {
  return <div className="flex flex-col">{children}</div>
}

export function App({
  name,
  title,
  children,
}: {
  name: string
  title: string
  children?: React.ReactNode
}) {
  const { recommended } = useToolkit()
  const slug = name.toLowerCase()
  const src = APP_ICON_SLUGS.has(slug) ? `/app-icons/${slug}.png` : null
  const isPick = recommended.has(slug)

  return (
    <section
      id={slugifyHeading(title)}
      style={isPick ? { order: -1 } : undefined}
      className="mt-[34px] scroll-mt-[24px]"
    >
      <div className="group/heading relative flex flex-wrap items-center gap-x-[11px] gap-y-[7px]">
        {/* the # anchor, matching prose headings (see registry AnchorLink) */}
        <a
          href={`#${slugifyHeading(title)}`}
          aria-label="Link to this section"
          className="absolute top-0 right-full mr-[8px] text-[20px] font-normal opacity-0 transition-opacity duration-150 select-none group-hover/heading:opacity-100 hover:!opacity-100"
          style={{ color: "var(--guide-accent, var(--jt-guides-accent))" }}
        >
          #
        </a>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            width={28}
            height={28}
            loading="lazy"
            className="!my-0 size-[28px] shrink-0 object-contain"
          />
        )}
        <h3 className="!m-0 text-[20px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
          {title}
        </h3>
        {isPick && (
          <span className="inline-flex items-center rounded-full bg-[var(--guide-accent,var(--jt-guides-accent))] px-[9px] py-[2.5px] text-[11.5px] font-semibold tracking-[-0.01em] text-[var(--jt-on-accent)]">
            Recommended for you :)
          </span>
        )}
      </div>
      {children}
    </section>
  )
}
