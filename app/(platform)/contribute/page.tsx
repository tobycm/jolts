import type { Metadata } from "next"
import Link from "next/link"

import {
  ArrowUpRight,
  GitPullRequest,
  PencilSimple,
} from "@phosphor-icons/react/dist/ssr"

import { Breadcrumb } from "@/components/breadcrumb"

export const metadata: Metadata = {
  title: "Contribute",
  description:
    "Jolts is community-written. How to write a guide, the block registry, and how pull requests get reviewed.",
  alternates: { canonical: "/contribute" },
}

const REPO = "https://github.com/hackclub/jolts"

const registry = [
  ["<Step>", "one photo, one action"],
  ["<PartsList>", "renders the frontmatter parts table"],
  ["<Tool>", "chip linking to a tool page - never teach a tool inline"],
  ["<ConceptLink>", "inline link to a concept - never explain one inline"],
  ["<Warning>", "anything they shouldn't learn the hard way"],
  ["<Checkpoint>", "what they should have before building further"],
  ["<Schematic>", "wiring diagram or figure with a caption"],
  ["<PinTable>", "pin → signal → why"],
  ["<Video>", "embedded YouTube, for technique that reads badly"],
  ["<Difficulty>", "inline difficulty chip"],
  ["<ExternalGuide>", "link out to Codex, Adafruit, datasheets"],
  ["<ReadMore>", "wraps guide-end ExternalGuides into a further-reading section"],
  ["<ShipIt>", "the end-of-guide banner"],
] as const

export default function ContributePage() {
  return (
    <div className="mx-auto w-full max-w-[820px] px-[32px] pt-[40px]">
      <Breadcrumb trail={[{ label: "Contribute", href: "/contribute" }]} />
      <h1 className="text-[38px] leading-[1.08] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        Write a guide
      </h1>
      <p className="mt-[10px] max-w-[640px] text-[17px] leading-[1.55] tracking-[-0.01em] text-[var(--jt-muted)]">
        Every guide on Jolts was written by someone who built the thing.
      </p>

      <div className="mt-[22px] flex flex-wrap items-center gap-[10px]">
        <Link
          href="/edit/new"
          className="group inline-flex items-center gap-[9px] rounded-[9px] bg-[var(--jt-guides-accent)] px-[18px] py-[11px] text-[15px] font-semibold tracking-[-0.02em] text-[var(--jt-on-accent)] transition-all duration-150 hover:brightness-105"
        >
          <PencilSimple size={18} weight="fill" aria-hidden />
          Write in the browser
        </Link>
        <a
          href={`${REPO}/new/main/content`}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-[9px] rounded-[9px] bg-[var(--jt-ink)] px-[18px] py-[11px] text-[15px] font-semibold tracking-[-0.02em] text-[var(--jt-page)] transition-colors duration-150 hover:opacity-90"
        >
          <GitPullRequest size={18} weight="bold" aria-hidden />
          Start on GitHub
          <ArrowUpRight
            size={14}
            weight="bold"
            className="transition-transform duration-150 group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
            aria-hidden
          />
        </a>
      </div>
      <p className="mt-[10px] text-[13px] tracking-[-0.01em] text-[var(--jt-faint)]">
        The visual editor shows the page as it will ship.
      </p>

      <h2 className="mt-[44px] text-[26px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        How it works
      </h2>
      <ol className="mt-[12px] list-decimal space-y-[10px] pl-[22px] text-[15.5px] leading-[1.65] tracking-[-0.01em] text-[var(--jt-body)] marker:font-semibold marker:text-[var(--jt-fainter)]">
        <li>
          Write in the browser (photos drop right in), or fork the repo and
          copy <code className="rounded-[5px] bg-[var(--jt-fill)] px-[5px] py-[1.5px] font-mono text-[0.88em]">content/TEMPLATE.mdx</code>{" "}
          into <code className="rounded-[5px] bg-[var(--jt-fill)] px-[5px] py-[1.5px] font-mono text-[0.88em]">content/guides/your-slug/index.mdx</code>{" "}
          (or concepts/tools). Take plenty of photos while you build.
        </li>
        <li>
          Write with the block registry below. Plain markdown for prose,
          blocks for structure - no arbitrary JSX.
        </li>
        <li>
          Hit <strong className="font-semibold text-[var(--jt-ink)]">Save changes</strong>{" "}
          and the editor opens a pull request for you. A reviewer goes
          through it with you before it ships.
        </li>
        <li>
          Once it merges, your guide is live with your name and GitHub avatar
          on it.
        </li>
      </ol>

      <h2 className="mt-[44px] text-[26px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        The bar for guides
      </h2>
      <p className="mt-[10px] text-[15.5px] leading-[1.7] tracking-[-0.01em] text-[var(--jt-body)]">
        A guide has to be clear, easy to follow, and structured well enough
        that someone can build the thing from it without getting lost.
        Concepts and tools are held to the same bar.
      </p>

      <h2 className="mt-[44px] text-[26px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        The block registry
      </h2>
      <p className="mt-[10px] text-[15.5px] leading-[1.7] tracking-[-0.01em] text-[var(--jt-body)]">
        These blocks are the whole vocabulary. Anything else fails CI.
      </p>
      <table className="mt-[14px] w-full border-collapse border-t border-[var(--jt-line)] text-[14px] tracking-[-0.01em]">
        <tbody className="divide-y divide-[var(--jt-line-soft)]">
          {registry.map(([tag, what]) => (
            <tr key={tag}>
              <td className="w-[160px] py-[8px] pr-[16px] font-mono text-[13px] font-medium whitespace-nowrap text-[var(--jt-ink)]">
                {tag}
              </td>
              <td className="py-[8px] text-[var(--jt-muted)]">{what}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-[44px] text-[26px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        Linking discipline
      </h2>
      <p className="mt-[10px] text-[15.5px] leading-[1.7] tracking-[-0.01em] text-[var(--jt-body)]">
        Link to a concept page instead of explaining the concept inline, and
        to a tool page instead of teaching the tool. Guides stay short that
        way, and each idea is written once, where people go looking for it.
        For anything outside what Jolts covers, link out with <code className="rounded-[5px] bg-[var(--jt-fill)] px-[5px] py-[1.5px] font-mono text-[0.88em]">&lt;ExternalGuide&gt;</code>.
      </p>

      <h2 className="mt-[44px] text-[26px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        Licensing
      </h2>
      <p className="mt-[10px] text-[15.5px] leading-[1.7] tracking-[-0.01em] text-[var(--jt-body)]">
        By submitting a pull request you agree that your guide text, images,
        and design files (KiCad, STLs) are licensed{" "}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          className="font-medium text-[var(--jt-ink)] underline decoration-[var(--jt-line-strong)] underline-offset-2 hover:decoration-[var(--jt-ink)]"
        >
          CC BY-SA 4.0
        </a>{" "}
        and code snippets are{" "}
        <a
          href="https://opensource.org/license/mit"
          className="font-medium text-[var(--jt-ink)] underline decoration-[var(--jt-line-strong)] underline-offset-2 hover:decoration-[var(--jt-ink)]"
        >
          MIT
        </a>
        . Your name stays on the guide.
      </p>

      <p className="mt-[34px] text-[13.5px] tracking-[-0.01em] text-[var(--jt-faint)]">
        If you&rsquo;ve built something that isn&rsquo;t in{" "}
        <Link
          href="/guides"
          className="font-semibold text-[var(--jt-body)] underline decoration-[var(--jt-line-strong)] underline-offset-2 hover:decoration-[var(--jt-ink)]"
        >
          the guides
        </Link>{" "} yet, write it up.
      </p>
    </div>
  )
}
