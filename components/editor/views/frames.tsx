"use client"

import { CheckCircle, RocketLaunch, Warning as WarningIcon } from "@phosphor-icons/react"
import type { NodeViewProps } from "@tiptap/react"
import { NodeViewContent } from "@tiptap/react"

import {
  CheckerFrame,
  estimateFlagWidth,
  leftFlagMaskStyle,
  type FrameTheme,
} from "@/components/checker-frame"
import { useEditorCtx } from "@/components/editor/context"
import { BlockShell, InlineSizedInput } from "@/components/editor/views/bits"
import { typeTheme } from "@/lib/theme"

/* Warning / Checkpoint / ShipIt blocks - the exact FlagFrame chrome from
   the reader, with the flag label as an editable inline-sized input. The
   surface cutout tracks the label estimate the same way the server does. */

const warningFrame: FrameTheme = {
  frame: "var(--jt-guides-frame)",
  checkerA: "var(--jt-guides-checker-a)",
  checkerB: "var(--jt-guides-checker-b)",
  wash: "var(--jt-guides-wash)",
}

const checkpointFrame: FrameTheme = {
  frame: "var(--jt-check-frame)",
  checkerA: "var(--jt-check-checker-a)",
  checkerB: "var(--jt-check-checker-b)",
  wash: "var(--jt-check-wash)",
}

function EditableFlagFrame({
  props,
  theme,
  icon,
  label,
  defaultLabel,
  onLabel,
  kind,
}: {
  props: NodeViewProps
  theme: FrameTheme
  icon: React.ReactNode
  label: string | null
  defaultLabel: string
  onLabel: (v: string | null) => void
  kind: string
}) {
  const shown = label ?? defaultLabel
  const notchW = estimateFlagWidth(shown)
  return (
    <BlockShell props={props} label={kind}>
      <aside className="my-[30px]">
        <CheckerFrame
          theme={theme}
          className="shadow-[0px_4px_14px_-2px_rgba(0,0,0,0.18)]"
        >
          <span
            className="absolute top-[5px] left-[5px] z-10 flex h-[28px] items-center gap-[6px] pl-[15px] text-[13.5px] font-semibold tracking-[-0.02em] text-white [filter:drop-shadow(0px_1.5px_3px_rgba(0,0,0,0.3))]"
            contentEditable={false}
          >
            {icon}
            <InlineSizedInput
              value={label ?? ""}
              placeholder={defaultLabel}
              onChange={(v) => onLabel(v === "" ? null : v)}
              aria-label={`${kind} label`}
            />
          </span>
          <div
            className="relative rounded-[7px] bg-white px-[15px] pt-[38px] pb-[13px]"
            style={leftFlagMaskStyle(notchW)}
          >
            <NodeViewContent className="jolts-tight text-[14.5px] leading-[1.6] tracking-[-0.01em] text-[#5c6470]" />
          </div>
        </CheckerFrame>
      </aside>
    </BlockShell>
  )
}

export function WarningView(props: NodeViewProps) {
  return (
    <EditableFlagFrame
      props={props}
      theme={warningFrame}
      icon={<WarningIcon size={15} weight="fill" aria-hidden />}
      label={(props.node.attrs.title as string | null) ?? null}
      defaultLabel="Careful"
      onLabel={(title) => props.updateAttributes({ title })}
      kind="warning"
    />
  )
}

export function CheckpointView(props: NodeViewProps) {
  return (
    <EditableFlagFrame
      props={props}
      theme={checkpointFrame}
      icon={<CheckCircle size={15} weight="fill" aria-hidden />}
      label={(props.node.attrs.title as string | null) ?? null}
      defaultLabel="Checkpoint"
      onLabel={(title) => props.updateAttributes({ title })}
      kind="checkpoint"
    />
  )
}

/* ---------- ShipIt ---------- */

export function ShipItView(props: NodeViewProps) {
  const ctx = useEditorCtx()
  const theme = typeTheme[ctx.contentType]
  const empty =
    props.node.childCount === 1 &&
    props.node.firstChild !== null &&
    props.node.firstChild.type.name === "paragraph" &&
    props.node.firstChild.childCount === 0
  return (
    <BlockShell props={props} label="ship it">
      <aside
        className="relative mt-[48px] overflow-hidden rounded-[12px] p-[6px]"
        style={{ background: theme.accent }}
      >
        <div
          aria-hidden
          className="absolute -inset-[60%] rotate-[-12deg]"
          style={{
            backgroundImage: `conic-gradient(${theme.checkerA} 0 25%, ${theme.checkerB} 0 50%, ${theme.checkerA} 0 75%, ${theme.checkerB} 0)`,
            backgroundSize: "150px 150px",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(${theme.wash},0) 0%, rgba(${theme.wash},0.55) 100%)`,
          }}
        />
        <div className="relative rounded-[7px] bg-white px-[22px] py-[18px]">
          <p
            className="!m-0 flex items-center gap-[9px] text-[20px] font-semibold tracking-[-0.03em] text-[#16181d]"
            contentEditable={false}
          >
            <RocketLaunch
              size={22}
              weight="fill"
              style={{ color: theme.accent }}
              aria-hidden
            />
            Ship it!
          </p>
          <div className="jolts-tight relative mt-[4px] text-[14.5px] leading-[1.6] tracking-[-0.01em] text-[#5c6470]">
            {empty && (
              <p
                className="pointer-events-none absolute inset-0 !m-0 text-black/35"
                contentEditable={false}
              >
                Leave empty for the standard #ship message, or write your
                own send-off.
              </p>
            )}
            <NodeViewContent />
          </div>
        </div>
      </aside>
    </BlockShell>
  )
}
