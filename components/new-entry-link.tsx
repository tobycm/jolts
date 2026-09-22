import Link from "next/link"

import { Plus } from "@phosphor-icons/react/dist/ssr"

import type { ContentType } from "@/lib/content-schema"
import { typeTheme } from "@/lib/theme"

/* Creation lives where the absence is felt (the Wikipedia lesson): every
   hub ends with an invitation to write the next entry, straight into the
   visual editor. */

export function NewEntryCard({ type }: { type: ContentType }) {
  const theme = typeTheme[type]
  return (
    <Link
      href={`/edit/new?type=${type}`}
      className="group flex min-h-[180px] flex-col items-center justify-center gap-[10px] rounded-[14px] border-2 border-dashed border-[var(--jt-line-dashed)] px-[20px] text-center transition-colors duration-150 hover:border-[var(--jt-line-hover)]"
    >
      <span
        className="flex size-[36px] items-center justify-center rounded-full text-[var(--jt-on-accent)] transition-transform duration-150 group-hover:scale-110"
        style={{ background: theme.accent }}
      >
        <Plus size={18} weight="bold" aria-hidden />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--jt-ink)]">
        Write a new {theme.label.toLowerCase()}
      </span>
      <span className="text-[12.5px] leading-[1.5] tracking-[-0.01em] text-[var(--jt-faint)]">
        Built something worth teaching? Teach it.
      </span>
    </Link>
  )
}

export function NewEntryRow({ type }: { type: ContentType }) {
  const theme = typeTheme[type]
  return (
    <Link
      href={`/edit/new?type=${type}`}
      className="group flex items-center gap-[12px] rounded-[10px] border-2 border-dashed border-[var(--jt-line-dashed)] px-[16px] py-[13px] transition-colors duration-150 hover:border-[var(--jt-line-hover)]"
    >
      <span
        className="flex size-[28px] shrink-0 items-center justify-center rounded-full text-[var(--jt-on-accent)] transition-transform duration-150 group-hover:scale-110"
        style={{ background: theme.accent }}
      >
        <Plus size={14} weight="bold" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-semibold tracking-[-0.02em] text-[var(--jt-ink)]">
          Add a {theme.label.toLowerCase()}
        </span>
        <span className="block text-[12.5px] tracking-[-0.01em] text-[var(--jt-faint)]">
          Write it well once - every guide can link to it.
        </span>
      </span>
    </Link>
  )
}
