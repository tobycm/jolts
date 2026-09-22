import Link from "next/link"

const links = [
  { label: "About Jolts", href: "/start" },
  { label: "Style Guide", href: "/style-guide" },
  { label: "Slack", href: "https://hackclub.enterprise.slack.com/archives/C0BQ57WQ0K1" },
  { label: "GitHub", href: "https://github.com/hackclub/jolts" },
]

export function SiteFooter() {
  return (
    <footer className="mt-[80px] pb-[56px]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center gap-[8px] px-[28px] text-center opacity-60">
        <nav className="flex flex-wrap items-center justify-center gap-x-[10px] gap-y-[4px] text-[13px] font-medium tracking-[-0.01em] text-[var(--jt-muted)]">
          {links.map(({ label, href }, i) => (
            <span key={label} className="flex items-center gap-[10px]">
              {i > 0 && <span aria-hidden>·</span>}
              {href.startsWith("/") ? (
                <Link
                  href={href}
                  className="transition-opacity duration-150 hover:opacity-70"
                >
                  {label}
                </Link>
              ) : (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-opacity duration-150 hover:opacity-70"
                >
                  {label}
                </a>
              )}
            </span>
          ))}
        </nav>

        <div className="mt-[10px] flex items-center gap-[20px]">
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noreferrer"
            aria-label="Guide text and images are CC BY-SA 4.0"
            className="flex items-center gap-[5px] transition-opacity duration-150 hover:opacity-70"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/cc.svg" alt="Creative Commons" className="h-[26px] w-auto" loading="lazy" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/by.svg" alt="Attribution" className="h-[26px] w-auto" loading="lazy" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sa.svg" alt="ShareAlike" className="h-[26px] w-auto" loading="lazy" />
          </a>
          <a
            href="https://hackclub.com"
            target="_blank"
            rel="noreferrer"
            aria-label="A Hack Club project"
            className="transition-opacity duration-150 hover:opacity-70"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/hackclub-flag.svg"
              alt="Hack Club"
              className="h-[26px] w-auto"
              loading="lazy"
            />
          </a>
        </div>
      </div>
    </footer>
  )
}
