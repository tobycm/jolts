"use client"

import { useId } from "react"

import { ArrowUpRight } from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"

import { CheckerFrame, type FrameTheme } from "@/components/checker-frame"
import { useToolkit } from "@/components/mdx/toolkit-context"
import {
  PICKS,
  recommendedApps,
  type AppRef,
  type ToolkitQuestion,
} from "@/lib/toolkit"

/* Three questions, one recommended set of apps. The data and rules live in
   lib/toolkit (shared with the header tags via toolkit-context); this file is
   just the UI. See lib/toolkit for how the answers map to picks. */

export type { ToolkitQuestion }

/* ---------- the block ---------- */

/* Site pages borrow the guides family (see lib/theme), and --guide-accent
   is set on the article wrapper, so the numerals pick up whichever type
   the page belongs to. */
const frame: FrameTheme = {
  frame: "var(--jt-guides-frame)",
  checkerA: "var(--jt-guides-checker-a)",
  checkerB: "var(--jt-guides-checker-b)",
  wash: "var(--jt-guides-wash)",
}

const ACCENT = "var(--guide-accent, var(--jt-guides-accent))"

/* The picks spring open and fade in together, so the panel growing and
   the text arriving read as one movement. The frame's checker is pinned to
   its top edge (see CheckerFrame) so the pattern doesn't slide while the
   panel moves. */
const OPEN = {
  height: { type: "spring", stiffness: 420, damping: 38 },
  opacity: { duration: 0.18, ease: [0.3, 0, 0, 1] },
} as const

/* The app's own icon, inline with its name and sized to the line. The
   white ground is invisible on the light surface and is what keeps the
   dark marks (KiCad's, Thonny's) from disappearing into the dark one. */
function AppIcon({ app }: { app: AppRef }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={app.icon}
      alt=""
      width={17}
      height={17}
      loading="lazy"
      className="!my-0 size-[17px] shrink-0 self-center rounded-[4px] bg-white p-[1.5px] object-contain"
    />
  )
}

function AppLink({ app }: { app: AppRef }) {
  return (
    <a
      href={app.href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-baseline gap-[4px] font-semibold text-[var(--jt-ink)] no-underline"
    >
      <AppIcon app={app} />
      <span className="underline decoration-[var(--jt-line-strong)] decoration-[1.5px] underline-offset-[3px] transition-colors duration-150 group-hover:decoration-[var(--jt-ink)]">
        {app.name}
      </span>
      <ArrowUpRight
        size={12}
        weight="bold"
        className="shrink-0 self-center text-[var(--jt-faint)] transition-transform duration-150 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] group-hover:text-[var(--jt-ink)]"
        aria-hidden
      />
    </a>
  )
}

export function ToolkitPicker({ questions }: { questions: ToolkitQuestion[] }) {
  const { answers, setAnswers } = useToolkit()
  const groupId = useId()

  const done = questions.length > 0 && questions.every((q) => answers[q.id])
  // aligned with PICKS, so the map below can pair each job with its app
  const apps = recommendedApps(answers)

  return (
    <CheckerFrame
      theme={frame}
      className="my-[30px] shadow-[0px_4px_14px_-2px_rgba(0,0,0,0.18)]"
      checkerSize={150}
      pinned
    >
      <div className="relative rounded-[7px] bg-[var(--jt-surface)]">
        <div className="px-[16px] py-[14px]">
          {/* radiogroups, not fieldsets: a floated legend fights the chip
              row's wrapping */}
          <div className="flex flex-col gap-[14px]">
            {questions.map((q, i) => (
              <div
                key={q.id}
                role="radiogroup"
                aria-labelledby={`${groupId}-${q.id}`}
              >
                <p
                  id={`${groupId}-${q.id}`}
                  className="!m-0 flex items-baseline gap-[8px] text-[14.5px] font-semibold tracking-[-0.02em] text-[var(--jt-ink)]"
                >
                  <span
                    className="w-[11px] shrink-0 text-right text-[11.5px] tabular-nums transition-colors duration-200"
                    style={{
                      color: answers[q.id] ? ACCENT : "var(--jt-fainter)",
                    }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  {q.prompt}
                </p>
                <div className="mt-[7px] flex flex-wrap gap-[7px] pl-[19px]">
                  {q.options.map((option) => {
                    const active = answers[q.id] === option
                    return (
                      <label
                        key={option}
                        className={
                          "cursor-pointer rounded-full border px-[12px] py-[5px] text-[13.5px] tracking-[-0.01em] transition-colors duration-150 " +
                          (active
                            ? "border-transparent bg-[var(--jt-ink)] text-[var(--jt-page)]"
                            : "border-[var(--jt-line)] bg-[var(--jt-surface)] text-[var(--jt-body)] hover:border-[var(--jt-line-hover)]")
                        }
                      >
                        <input
                          type="radio"
                          name={`${groupId}-${q.id}`}
                          value={option}
                          checked={active}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: option }))
                          }
                          className="sr-only"
                        />
                        {option}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {done && (
              /* height on the wrapper, spacing on the child: a collapsing
                 element can't carry the margin it's meant to collapse */
              <motion.div
                key="picks"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={OPEN}
                className="overflow-hidden"
              >
                <div className="mt-[16px] border-t border-[var(--jt-line-soft)] pt-[14px]">
                  <div className="flex items-baseline justify-between gap-[12px]">
                    <p className="!m-0 text-[14.5px] font-semibold tracking-[-0.02em] text-[var(--jt-ink)]">
                      Try these out!
                    </p>
                    <button
                      type="button"
                      onClick={() => setAnswers({})}
                      className="cursor-pointer text-[13px] tracking-[-0.01em] text-[var(--jt-faint)] transition-colors duration-150 hover:text-[var(--jt-ink)]"
                    >
                      Start over
                    </button>
                  </div>
                  <ul className="!mt-[10px] !mb-0 grid !list-none gap-[10px] !p-0">
                    {PICKS.map(({ job }, i) => {
                      const app = apps[i]
                      return (
                        <li
                          key={job}
                          className="!m-0 grid gap-x-[14px] gap-y-[2px] sm:grid-cols-[92px_minmax(0,1fr)]"
                        >
                          <span className="pt-[1px] text-[12.5px] leading-[1.4] tracking-[-0.01em] text-[var(--jt-faint)]">
                            {job}
                          </span>
                          <span className="text-[14.5px] leading-[1.55] tracking-[-0.01em] text-[var(--jt-muted)]">
                            <AppLink app={app} /> {app.why}
                            {app.also && (
                              <>
                                {" "}
                                Write it in <AppLink app={app.also} />
                                {" - "}
                                {app.also.why.charAt(0).toLowerCase() +
                                  app.also.why.slice(1)}
                              </>
                            )}
                            {app.caveat && (
                              <span className="mt-[1px] block text-[13px] text-[var(--jt-faint)]">
                                {app.caveat}
                              </span>
                            )}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </CheckerFrame>
  )
}
