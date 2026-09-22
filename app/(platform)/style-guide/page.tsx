import type { Metadata } from "next"
import Link from "next/link"

import { Check, X } from "@phosphor-icons/react/dist/ssr"

import { Breadcrumb } from "@/components/breadcrumb"

export const metadata: Metadata = {
  title: "Style Guide",
  description: "The Jolts style guide!",
  alternates: { canonical: "/style-guide" },
}

function Section({
  title,
  tldr,
  children,
}: {
  title: string
  tldr?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mt-[44px] text-[26px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        {title}
      </h2>
      {tldr && (
        <p className="mt-[8px] text-[13.5px] tracking-[-0.01em] text-[var(--jt-faint)]">
          <span className="font-semibold text-[var(--jt-muted)]">TL;DR:</span> {tldr}
        </p>
      )}
      {children}
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-[10px] text-[15.5px] leading-[1.7] tracking-[-0.01em] text-[var(--jt-body)]">
      {children}
    </p>
  )
}

function Rules({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-[12px] list-disc space-y-[8px] pl-[22px] text-[15.5px] leading-[1.65] tracking-[-0.01em] text-[var(--jt-body)] marker:text-[var(--jt-fainter)]">
      {children}
    </ul>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[5px] bg-[var(--jt-fill)] px-[5px] py-[1.5px] font-mono text-[0.88em]">
      {children}
    </code>
  )
}

/* a good/bad example pair */
function Examples({ good, bad }: { good: string; bad: string }) {
  return (
    <div className="mt-[12px] flex flex-col gap-[6px] text-[14.5px] tracking-[-0.01em]">
      <div className="flex items-baseline gap-[9px]">
        <Check size={14} weight="bold" className="translate-y-[1.5px] shrink-0 text-[var(--jt-good)]" aria-label="Do" />
        <span className="text-[var(--jt-body)]">{good}</span>
      </div>
      <div className="flex items-baseline gap-[9px]">
        <X size={14} weight="bold" className="translate-y-[1.5px] shrink-0 text-[var(--jt-bad)]" aria-label="Don't" />
        <span className="text-[var(--jt-faint)] line-through decoration-[var(--jt-line-strong)]">{bad}</span>
      </div>
    </div>
  )
}

export default function StyleGuidePage() {
  return (
    <div className="mx-auto w-full max-w-[820px] px-[32px] pt-[40px] pb-[40px]">
      <Breadcrumb trail={[{ label: "Style guide", href: "/style-guide" }]} />
      <h1 className="text-[38px] leading-[1.08] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        Style guide
      </h1>
      <p className="mt-[10px] max-w-[640px] text-[17px] leading-[1.55] tracking-[-0.01em] text-[var(--jt-muted)]">
        Jolts will be written by many people, but should read like one unified
        encyclopedia. i.e. every page should feel like it came from the same
        person. This page is the standard of what Jolts page should be (and
        how you can get through PR review in one go :p) It won&rsquo;t cover
        every situation; when in doubt, copy styles of other pages, or ask
        in #jolts!
      </p>

      <Section
        title="Titles"
        tldr="Just name what it is! Don't add 'Learn how to' etc."
      >
        <Rules>
          <li>
            A guide should be titled after the thing it teaches to build!
          </li>
          <li>
            For example, a guide teaching you how to make a tamagotchi should
            be just named &quot;tamagotchi&quot;
          </li>
          <li>
            Sentence case for titles and headings: capitalize the first word
            and proper nouns, our font for title, augiepixel, will show it as
            lower case regardless.
          </li>
          <li>
            No articles up front (&ldquo;Macropad&rdquo;, not &ldquo;The
            macropad&rdquo;)
          </li>
          <li>
            Folder slugs are kebab-case! <Code>split-keyboard</Code>, not{" "}
            <Code>Split_Keyboard</Code>.
          </li>
        </Rules>
        <Examples
          good="Macropad: Build a tiny keyboard that does whatever you tell it to do :D"
          bad="How To Build Your Own Awesome Macropad!!!"
        />
      </Section>

      <Section
        title="Voice"
        tldr="Always remember you're writing for another person, assume zero experience."
      >
        <Rules>
          <li>
            American English spelling. Gender-neutral language!
          </li>
          <li>
            Please write in a style that is easy to understand.
          </li>
        </Rules>
        <Examples
          good="Push each switch in until it clicks flush. Bent pins fold flat instead of entering the socket, and check both pins before seating!"
          bad="Next, we simply want to go ahead and easily insert our switches!"
        />
      </Section>

      <Section
        title="Steps"
      >
        <Rules>
          <li>
            Steps are not headers! The step title should be the action. Make them short!
          </li>
          <li>
            Write a <Code>&lt;Checkpoint&gt;</Code>
            for each 3-5 steps!
          </li>
        </Rules>
      </Section>

      <Section
        title="Headings"
      >
        <Rules>
          <li>
            Don&rsquo;t repeat the page&rsquo;s subject!
          </li>
          <li>
            Unique within a page.
          </li>
        </Rules>
      </Section>

      <Section
        title="Linking"
      >
        <Rules>
          <li>
            Ideally, you won&rsquo;t have to explain a concept within a guide, you can link it with a{" "}
            <Code>&lt;ConceptLink&gt;</Code>. Which is different to <Code>&lt;Tool&gt;</Code> chip.
          </li>
          <li>
            You can use{" "}
            <Code>&lt;ExternalGuide&gt;</Code> to link stuff that&rsquo;s out of Jolts scope, or stuff that Jolt doesn&rsquo;t yet have and won&rsquo;t in the foreseeable future.
          </li>
        </Rules>
      </Section>
      <Section
        title="Numbers and units"
      >
        <Rules>
          <li>
            Always use digits! Even if it&rsquo;s a small number.
          </li>
          <li>
            Units without a space unless generally it is used with a space, such as 3.3V, 10kΩ, 470Ω, 16MHz, 500mA.
          </li>
          <li>Commas as thousands separators: 1,000.</li>
        </Rules>
      </Section>

      <Section
        title="Photos"
      >
        <Rules>
          <li>
            <Code>hero</Code> should ideally be an image of the finished
            build with transparent background
          </li>
          <li>
            Descriptive kebab-case filenames, like{" "}
            <Code>switch-soldering.jpg</Code>, not <Code>IMG_4021.jpg</Code>.
          </li>
          <li>
            Please write Alt Texts for your images, they should be descriptive as well.
          </li>
          <li>
            Only upload photos you took or have the right to share! They
            shall be CC BY-SA 4.0.
          </li>
        </Rules>
      </Section>

      <Section
        title="Warnings"
      >
        <P>
          Sometimes you might want to show something important in a noticeable box! <Code>&lt;Warning&gt;</Code> is for anything they SHOULD
          be aware of to avoid bad things: burns, shorts, lithium batteries, mains
          voltage, kabooms.
          However, it is important to not overuse warnings. If everything is a warning
          people will ignore them :pf:
        </P>
      </Section>

      <Section
        title="Tags"
        tldr="Estimate for a first-timer and beginner!"
      >
        <Rules>
          <li>
            <Code>time</Code> and <Code>difficulty</Code> should be measured
            against someone doing this for the first time.
          </li>
          <li>
            <Code>learns</Code> lists skills that reader will use throughout the guide, it&rsquo;ll link to a tool/concept.
          </li>
        </Rules>
      </Section>

      <Section title="Where this comes from">
        <P>
          This style guide is adopted from some rules from, but not limited to:
        </P>
        <ul className="mt-[12px] space-y-[6px] text-[14.5px] tracking-[-0.01em]">
          {[
            ["iFixit: Writing Guide Standards", "https://www.ifixit.com/Info/Writing_Guides"],
            ["Wikipedia: Manual of Style", "https://en.wikipedia.org/wiki/Wikipedia:Manual_of_Style"],
            ["Google: developer documentation style guide", "https://developers.google.com/style"],
            ["Star Citizen Wiki: Style guide", "https://starcitizen.tools/Star_Citizen_Wiki:Style_guide"],
          ].map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--jt-body)] underline decoration-[var(--jt-line-strong)] underline-offset-2 hover:decoration-[var(--jt-ink)]"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <p className="mt-[34px] text-[13.5px] tracking-[-0.01em] text-[var(--jt-faint)]">
        This is in no way comprehensive, I wrote this at 3am, contributions to the style guide would be appreciated! - Anson
      </p>

      <p className="mt-[34px] text-[13.5px] tracking-[-0.01em] text-[var(--jt-faint)]">
        Are you ready?{" "}
        <Link
          href="/contribute"
          className="font-semibold text-[var(--jt-body)] underline decoration-[var(--jt-line-strong)] underline-offset-2 hover:decoration-[var(--jt-ink)]"
        >
          Write a guide
        </Link>
        .
      </p>
    </div>
  )
}
