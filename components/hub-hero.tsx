import type { ContentType } from "@/lib/content"
import { typeTheme } from "@/lib/theme"

/* Hub page header: the title carries its own weight; the content type's
   identity appears as a short checker rule beneath it - the header's
   chrome language at its quietest. */
export function HubHero({
  type,
  title,
  blurb,
}: {
  type: ContentType
  title: string
  blurb: string
}) {
  const theme = typeTheme[type]
  return (
    <div>
      <h1 className="text-[36px] leading-[1.1] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        {title}
      </h1>
      <div
        aria-hidden
        className="mt-[10px] h-[7px] w-[76px] overflow-hidden rounded-full"
        style={{
          backgroundImage: `conic-gradient(${theme.tickA} 0 25%, ${theme.tickB} 0 50%, ${theme.tickA} 0 75%, ${theme.tickB} 0)`,
          backgroundSize: "14px 14px",
          backgroundPosition: "0 3.5px",
        }}
      />
      <p className="mt-[12px] max-w-[560px] text-[15px] leading-[1.6] tracking-[-0.01em] text-[var(--jt-muted)]">
        {blurb}
      </p>
    </div>
  )
}
