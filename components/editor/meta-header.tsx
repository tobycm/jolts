"use client"

import { useEffect, useRef, useState } from "react"

import { CaretDown, Check, Clock, Coins, Cube, Notebook, Wrench, X } from "@phosphor-icons/react"

import { useEditorCtx } from "@/components/editor/context"
import { GhostInput, GhostTextarea, ImageSlot } from "@/components/editor/views/bits"
import type { EntryMeta } from "@/lib/content-schema"
import { typeTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

/* The overview header, editable in place: the same graph-paper card
   readers see, with every fact editable where it is displayed. */

function ChipsInput({
  values,
  onChange,
  placeholder,
  suggestions,
  accent,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
  suggestions?: string[]
  accent: string
}) {
  const [draft, setDraft] = useState("")
  const commit = () => {
    const v = draft.trim().replace(/,$/, "")
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft("")
  }
  const open = suggestions?.filter(
    (s) => !values.includes(s) && s.toLowerCase().includes(draft.toLowerCase())
  )
  return (
    <span className="relative flex flex-wrap items-center gap-[5px]">
      {values.map((v) => (
        <span
          key={v}
          className="group/chip inline-flex h-[22px] items-center gap-[3px] rounded-full border border-black/10 bg-white pr-[5px] pl-[9px] text-[12px] tracking-[-0.01em] text-[#33383f]"
        >
          {v}
          <button
            type="button"
            title={`Remove ${v}`}
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="rounded-full p-[1px] text-[#c2c7ce] hover:bg-black/[0.07] hover:text-[#16181d]"
          >
            <X size={10} weight="bold" />
          </button>
        </span>
      ))}
      <span className="relative">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault()
              commit()
            }
            if (e.key === "Backspace" && draft === "" && values.length) {
              onChange(values.slice(0, -1))
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          spellCheck={false}
          className="h-[22px] w-[140px] border-none bg-transparent text-[12px] outline-none placeholder:text-black/30"
        />
        {draft && open && open.length > 0 && (
          <span className="absolute top-[calc(100%+4px)] left-0 z-30 block w-[180px] overflow-hidden rounded-[9px] border border-black/10 bg-white py-[3px] shadow-[0px_8px_20px_-6px_rgba(0,0,0,0.22)]">
            {open.slice(0, 6).map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange([...values, s])
                  setDraft("")
                }}
                className="block w-full px-[10px] py-[4px] text-left text-[12.5px] hover:bg-black/[0.04]"
                style={{ color: accent }}
              >
                {s}
              </button>
            ))}
          </span>
        )}
      </span>
    </span>
  )
}

function EditTag({
  info,
  children,
}: {
  info: string
  children: React.ReactNode
}) {
  return (
    <span
      title={info}
      className="inline-flex h-[29px] items-center gap-[7px] rounded-full border border-black/10 bg-white px-[12px] text-[13px] tracking-[-0.01em] text-[#33383f]"
    >
      {children}
    </span>
  )
}

const LEVELS = ["beginner", "intermediate", "advanced"] as const

/* same copy the reader sees in the fact-tag tooltips */
const LEVEL_INFO: Record<(typeof LEVELS)[number], string> = {
  beginner: "No experience needed - every step is spelled out",
  intermediate: "Assumes you've built something simple before",
  advanced: "Sparse hand-holding - expect to debug on your own",
}

function Dots({ level, accent }: { level: (typeof LEVELS)[number]; accent: string }) {
  const filled = LEVELS.indexOf(level) + 1
  return (
    <span className="flex gap-[2.5px]" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="size-[6px] rounded-full"
          style={{ background: i <= filled ? accent : "rgba(0,0,0,0.12)" }}
        />
      ))}
    </span>
  )
}

function DifficultyPicker({
  value,
  accent,
  onChange,
}: {
  value: (typeof LEVELS)[number]
  accent: string
  onChange: (level: (typeof LEVELS)[number]) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", close)
    return () => window.removeEventListener("mousedown", close)
  }, [open])

  return (
    <span ref={rootRef} className="relative">
      <button
        type="button"
        title="How much prior experience this guide assumes"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-[29px] items-center gap-[7px] rounded-full border border-black/10 bg-white px-[12px] text-[13px] tracking-[-0.01em] text-[#33383f] capitalize transition-colors hover:border-black/25"
      >
        <Dots level={value} accent={accent} />
        {value}
        <CaretDown
          size={11}
          weight="bold"
          className={cn("text-[#9aa1ab] transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <span
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-0 z-40 block w-[260px] overflow-hidden rounded-[11px] border border-black/10 bg-white py-[4px] shadow-[0px_10px_28px_-6px_rgba(0,0,0,0.28)]"
        >
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="option"
              aria-selected={l === value}
              onClick={() => {
                onChange(l)
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-start gap-[9px] px-[12px] py-[7px] text-left transition-colors hover:bg-black/[0.04]",
                l === value && "bg-black/[0.03]"
              )}
            >
              <span className="mt-[5px]">
                <Dots level={l} accent={accent} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold tracking-[-0.01em] text-[#16181d] capitalize">
                  {l}
                </span>
                <span className="block text-[11.5px] leading-[1.45] text-[#9aa1ab]">
                  {LEVEL_INFO[l]}
                </span>
              </span>
              {l === value && (
                <Check
                  size={13}
                  weight="bold"
                  className="mt-[4px] shrink-0"
                  style={{ color: accent }}
                  aria-hidden
                />
              )}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

export function MetaHeader() {
  const ctx = useEditorCtx()
  const meta = ctx.meta
  const theme = typeTheme[ctx.contentType]
  const set = (patch: Partial<EntryMeta>) =>
    ctx.setMeta((m) => ({ ...m, ...patch }) as EntryMeta)

  const authorNames = !meta.author
    ? []
    : Array.isArray(meta.author)
      ? meta.author
      : [meta.author]

  return (
    <>
      <header className="relative overflow-hidden rounded-[12px] border border-black/10 bg-[#FCFCFA]">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(22,24,29,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(22,24,29,0.055) 1px, transparent 1px)",
            backgroundSize: "21px 21px",
            maskImage: "linear-gradient(180deg, black 0%, rgba(0,0,0,0.3) 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, black 0%, rgba(0,0,0,0.3) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(880px 560px at 90% -10%, ${theme.tint}, transparent 72%)`,
          }}
        />

        <div className="relative flex items-start gap-[26px] px-[24px] pt-[22px] pb-[16px]">
          <div className="min-w-0 flex-1">
            <h1 className="font-augie text-[40px] leading-[1.02] text-[#16181d]">
              <GhostInput
                value={meta.title}
                onChange={(v) => set({ title: v })}
                placeholder={`Name your ${theme.label.toLowerCase()}`}
              />
            </h1>
            <p className="mt-[10px] text-[16px] leading-[1.55] tracking-[-0.01em] text-[#5c6470]">
              <GhostTextarea
                value={meta.subtitle}
                onChange={(v) => set({ subtitle: v })}
                placeholder="One or two lines selling the outcome. What will they hold at the end?"
              />
            </p>

            {meta.type === "guide" && (
              <div className="mt-[10px] flex flex-wrap items-center gap-x-[6px] text-[14px] tracking-[-0.01em] text-[#9aa1ab]">
                <span className="shrink-0">You&rsquo;ll learn</span>
                <ChipsInput
                  values={meta.learns}
                  onChange={(learns) =>
                    ctx.setMeta((m) =>
                      m.type === "guide" ? { ...m, learns } : m
                    )
                  }
                  placeholder="add a skill…"
                  accent={theme.accent}
                />
              </div>
            )}
          </div>

          <div className="hidden w-[196px] shrink-0 rotate-[2.5deg] md:block">
            <ImageSlot
              src={meta.hero ?? null}
              resolved={meta.hero ? ctx.resolveImage(meta.hero) : null}
              onPick={async (file) => {
                const ref = await ctx.addUpload(file)
                set({ hero: ref })
              }}
              onRemove={() => set({ hero: undefined })}
              imgClassName="!my-0 aspect-[4/3] w-full rounded-[9px] border-[5px] border-white object-cover shadow-[0px_6px_18px_-4px_rgba(0,0,0,0.28)]"
              emptyLabel="Hero photo"
              className="aspect-[4/3]"
            />
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-x-[18px] gap-y-[8px] border-t border-black/[0.07] px-[24px] py-[11px] text-[13px] tracking-[-0.01em] text-[#5c6470]">
          <span className="inline-flex items-center gap-[6px]">
            by @
            <GhostInput
              value={authorNames.join(", ")}
              onChange={(v) => {
                const names = v
                  .split(",")
                  .map((s) => s.trim().replace(/^@/, ""))
                  .filter(Boolean)
                set({
                  author:
                    names.length === 0
                      ? undefined
                      : names.length === 1
                        ? names[0]
                        : names,
                })
              }}
              placeholder="your-github-username"
              className="w-[180px] font-medium text-[#33383f]"
            />
          </span>
          <span className="inline-flex items-center gap-[6px]">
            Contributors
            <GhostInput
              value={meta.contributors.join(", ")}
              onChange={(v) =>
                set({
                  contributors: v
                    .split(",")
                    .map((s) => s.trim().replace(/^@/, ""))
                    .filter(Boolean),
                })
              }
              placeholder="none yet"
              className="w-[200px]"
            />
          </span>
        </div>
      </header>

      <div className="mt-[12px] mb-[14px] flex flex-wrap items-center gap-[7px]">
        {meta.type === "guide" && (
          <>
            <DifficultyPicker
              value={meta.difficulty}
              accent={theme.accent}
              onChange={(difficulty) =>
                ctx.setMeta((m) =>
                  m.type === "guide" ? { ...m, difficulty } : m
                )
              }
            />
            <EditTag info="Hands-on time estimate">
              <Clock size={14} weight="fill" className="text-[#9aa1ab]" aria-hidden />
              <GhostInput
                value={meta.time}
                onChange={(v) =>
                  ctx.setMeta((m) => (m.type === "guide" ? { ...m, time: v } : m))
                }
                placeholder="1 weekend"
                className="w-[86px]"
              />
            </EditTag>
            <EditTag info="Approximate parts cost">
              <Coins size={14} weight="fill" className="text-[#9aa1ab]" aria-hidden />
              <GhostInput
                value={meta.cost}
                onChange={(v) =>
                  ctx.setMeta((m) => (m.type === "guide" ? { ...m, cost: v } : m))
                }
                placeholder="~$25"
                className="w-[56px]"
              />
            </EditTag>
            <button
              type="button"
              title="A project guide ends with a thing you made; a general guide teaches a practice"
              onClick={() =>
                ctx.setMeta((m) =>
                  m.type === "guide" ? { ...m, build: !m.build } : m
                )
              }
              className="inline-flex h-[29px] items-center gap-[7px] rounded-full border border-black/10 bg-white px-[12px] text-[13px] tracking-[-0.01em] text-[#33383f] transition-colors hover:border-black/25"
            >
              {meta.build ? (
                <Cube size={14} weight="fill" className="text-[#FF902F]" aria-hidden />
              ) : (
                <Notebook size={14} weight="fill" className="text-[#9aa1ab]" aria-hidden />
              )}
              {meta.build ? "project guide" : "general guide"}
            </button>
            <button
              type="button"
              title="Does this build need a soldering iron?"
              onClick={() =>
                ctx.setMeta((m) =>
                  m.type === "guide" ? { ...m, soldering: !m.soldering } : m
                )
              }
              className="inline-flex h-[29px] items-center gap-[7px] rounded-full border border-black/10 bg-white px-[12px] text-[13px] tracking-[-0.01em] text-[#33383f] transition-colors hover:border-black/25"
            >
              <Wrench
                size={14}
                weight="fill"
                className={meta.soldering ? "text-[#FF902F]" : "text-[#9aa1ab]"}
                aria-hidden
              />
              {meta.soldering ? "soldering required" : "no soldering"}
            </button>
            <EditTag info="Tool pages this build uses (slugs from content/tools)">
              <Wrench size={13} className="text-[#9aa1ab]" aria-hidden />
              <ChipsInput
                values={meta.tools}
                onChange={(tools) =>
                  ctx.setMeta((m) => (m.type === "guide" ? { ...m, tools } : m))
                }
                placeholder="uses tools…"
                suggestions={ctx.linkIndex.tools.map((t) => t.slug)}
                accent={theme.accent}
              />
            </EditTag>
          </>
        )}
        {meta.type === "tool" && (
          <EditTag info="Rough price band - leave empty for software">
            <Coins size={14} weight="fill" className="text-[#9aa1ab]" aria-hidden />
            <GhostInput
              value={meta.cost ?? ""}
              onChange={(v) =>
                ctx.setMeta((m) =>
                  m.type === "tool" ? { ...m, cost: v || undefined } : m
                )
              }
              placeholder="$15–40"
              className="w-[70px]"
            />
          </EditTag>
        )}
        <EditTag info="Search keywords for this page">
          <span className="text-[11px] font-semibold tracking-[0.04em] text-[#c2c7ce] uppercase">
            tags
          </span>
          <ChipsInput
            values={meta.tags}
            onChange={(tags) => set({ tags })}
            placeholder="add a tag…"
            accent={theme.accent}
          />
        </EditTag>
      </div>
    </>
  )
}
