import { House, PencilSimple } from "@phosphor-icons/react/dist/ssr"
import Link from "next/link"

/* Server-side breadcrumb for pages whose trail is known at render time:
   [home] / Concepts / Voltage. The last segment is the current page.
   (Guide pages use the client GuideBreadcrumb, which derives the page
   segment from the pathname so it can live in the persistent layout.) */

export function Breadcrumb({
  trail,
  accent = "var(--jt-ink)",
  editUrl,
}: {
  /** in order, current page last */
  trail: { label: string; href: string }[]
  accent?: string
  /** GitHub editor link for the page's source, shown at the row's end */
  editUrl?: string
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-[18px] flex flex-wrap items-center gap-[8px] text-[13px] tracking-[-0.01em]"
    >
      <Link
        href="/"
        aria-label="Home"
        className="flex items-center text-[var(--jt-faint)] transition-colors duration-150 hover:text-[var(--jt-ink)]"
      >
        <House size={14} weight="fill" aria-hidden />
      </Link>
      {trail.map((segment, i) => {
        const last = i === trail.length - 1
        return (
          <span key={segment.href} className="flex items-center gap-[8px]">
            <span aria-hidden className="text-[var(--jt-fainter)]">
              /
            </span>
            <Link
              href={segment.href}
              aria-current={last ? "page" : undefined}
              className={
                last
                  ? "font-semibold"
                  : "text-[var(--jt-faint)] transition-colors duration-150 hover:text-[var(--jt-ink)]"
              }
              style={last ? { color: accent } : undefined}
            >
              {segment.label}
            </Link>
          </span>
        )
      })}
      {editUrl && (
        <Link
          href={editUrl}
          className="ml-auto inline-flex items-center gap-[5px] text-[var(--jt-faint)] transition-colors duration-150 hover:text-[var(--jt-ink)]"
        >
          <PencilSimple size={13} weight="fill" aria-hidden />
          Edit
        </Link>
      )}
    </nav>
  )
}
