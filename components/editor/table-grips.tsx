"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Plus, Trash } from "@phosphor-icons/react"
import type { Editor } from "@tiptap/core"
import { selectedRect } from "@tiptap/pm/tables"

import { cn } from "@/lib/utils"

/* Table grips: a strip of handles above the columns and beside the rows,
   the same gutter language as the block handle. Pointing at a grip says
   which column or row you are about to change - a floating bar keyed to
   the caret can't, which is what made the first pass ambiguous.

   Everything offered here round-trips to a GFM table. Merged cells,
   split cells and header columns have no markdown spelling, so they are
   absent on purpose: a control that quietly loses its effect on save is
   worse than no control. The header row isn't toggleable either - every
   GFM table has one. */

const GRIP = 9 // grip thickness
const GAP = 4 // gutter between grip and table edge

type Box = { top: number; left: number; width: number; height: number }
type Grip = { index: number; box: Box; cell: HTMLElement }
type Model = { table: HTMLElement; box: Box; cols: Grip[]; rows: Grip[] }
type Menu = { axis: "col" | "row"; index: number; box: Box }
type Align = ("left" | "right" | "center" | null)[]

function toBox(r: DOMRect, origin: DOMRect): Box {
  return {
    top: r.top - origin.top,
    left: r.left - origin.left,
    width: r.width,
    height: r.height,
  }
}

function measure(table: HTMLElement, origin: DOMRect): Model | null {
  const rows = [...table.querySelectorAll<HTMLTableRowElement>("tr")]
  if (!rows.length) return null
  const headCells = [...rows[0].children] as HTMLElement[]
  return {
    table,
    box: toBox(table.getBoundingClientRect(), origin),
    cols: headCells.map((cell, index) => ({
      index,
      box: toBox(cell.getBoundingClientRect(), origin),
      cell,
    })),
    rows: rows.map((row, index) => ({
      index,
      box: toBox(row.getBoundingClientRect(), origin),
      cell: row.children[0] as HTMLElement,
    })),
  }
}

export function TableGrips({ editor }: { editor: Editor }) {
  const [model, setModel] = useState<Model | null>(null)
  const [hover, setHover] = useState<Menu | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const modelRef = useRef<Model | null>(null)
  const menuRef = useRef<Menu | null>(null)
  useEffect(() => {
    modelRef.current = model
  }, [model])
  useEffect(() => {
    menuRef.current = menu
  }, [menu])

  const container = useCallback(
    (): HTMLElement | null =>
      (editor.view?.dom?.closest(".jolts-editor-article") as HTMLElement) ??
      null,
    [editor]
  )

  /* The editor is constructed before EditorContent attaches its view and
     v3 throws on editor.view until then, so poll for readiness the way
     the block handle does - on a timer, since rAF never fires in a
     backgrounded tab. */
  const [ready, setReady] = useState<Editor | null>(() =>
    editor.isInitialized ? editor : null
  )
  useEffect(() => {
    if (editor.isDestroyed) return
    if (editor.isInitialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(editor)
      return
    }
    const timer = setInterval(() => {
      if (editor.isDestroyed) return clearInterval(timer)
      if (editor.isInitialized) {
        clearInterval(timer)
        setReady(editor)
      }
    }, 50)
    return () => clearInterval(timer)
  }, [editor])

  /* ---------- hover tracking ---------- */
  useEffect(() => {
    if (ready !== editor || editor.isDestroyed) return
    const root = container()
    if (!root) return
    let last = 0

    const onMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - last < 30) return
      last = now
      if (menuRef.current) return // frozen while a menu is open

      const el = e.target as Element | null
      const table =
        el?.closest?.(".ProseMirror table") ??
        (modelRef.current?.table.isConnected ? modelRef.current.table : null)
      if (!table) {
        if (modelRef.current) setModel(null)
        return
      }
      // keep the model while the pointer is over the table or its gutters
      const r = table.getBoundingClientRect()
      const inZone =
        e.clientX >= r.left - (GRIP + GAP + 10) &&
        e.clientX <= r.right + 30 &&
        e.clientY >= r.top - (GRIP + GAP + 10) &&
        e.clientY <= r.bottom + 30
      if (!inZone) {
        if (modelRef.current) setModel(null)
        return
      }
      setModel(measure(table as HTMLElement, root.getBoundingClientRect()))
    }

    document.addEventListener("mousemove", onMove, true)
    return () => document.removeEventListener("mousemove", onMove, true)
  }, [ready, editor, container])

  /* dismiss the menu on outside click or Escape */
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest?.("[data-table-menu]")) setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [menu])

  /* ---------- edits ----------
     Put the caret in the pointed-at cell first, so the table commands
     (which all work off the selection) act on the column or row the grip
     names rather than wherever the caret happened to be. */
  const focusCell = (cell: HTMLElement) => {
    const pos = editor.view.posAtDOM(cell, 0)
    editor.chain().focus().setTextSelection(pos + 1).run()
  }

  /** Per-column alignment lives in one table-level array that markdown
      indexes by column, so an insert or delete has to move it too -
      otherwise every column right of the edit inherits the wrong
      alignment the next time the file is written. */
  const realign = (edit: "before" | "after" | "delete"): Align | null => {
    const { $from } = editor.state.selection
    let table = null
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === "table") {
        table = $from.node(d)
        break
      }
    }
    const align = table?.attrs?.align as Align | null | undefined
    if (!align) return null
    let col: number
    try {
      col = selectedRect(editor.state).left
    } catch {
      return null
    }
    const next = [...align]
    if (edit === "delete") next.splice(col, 1)
    else next.splice(edit === "before" ? col : col + 1, 0, null)
    return next
  }

  const run = (
    axis: "col" | "row",
    cell: HTMLElement,
    op: "before" | "after" | "delete"
  ) => {
    focusCell(cell)
    if (axis === "row") {
      const c = editor.chain().focus()
      if (op === "before") c.addRowBefore()
      else if (op === "after") c.addRowAfter()
      else c.deleteRow()
      c.run()
    } else {
      // one transaction for the edit and the realigned array, so a single
      // undo puts both back
      const align = realign(op)
      const c = editor.chain().focus()
      if (op === "before") c.addColumnBefore()
      else if (op === "after") c.addColumnAfter()
      else c.deleteColumn()
      if (align) c.updateAttributes("table", { align })
      c.run()
    }
    setMenu(null)
    const table = modelRef.current?.table
    const root = container()
    setModel(null)
    if (table && root) {
      setTimeout(() => {
        if (table.isConnected) setModel(measure(table, root.getBoundingClientRect()))
      }, 60)
    }
  }

  if (ready !== editor || !model) return null
  const { box, cols, rows } = model
  const lastCol = cols[cols.length - 1]
  const lastRow = rows[rows.length - 1]
  const active = menu ?? hover

  return (
    <div className="pointer-events-none absolute inset-0 z-[40]" data-table-grips>
      {/* the column or row being pointed at, tinted so the target is
          unmistakable before anything is clicked */}
      {active && (
        <div
          className="absolute rounded-[3px] bg-[#FF902F]/[0.10]"
          style={
            active.axis === "col"
              ? {
                  top: box.top,
                  left: active.box.left,
                  width: active.box.width,
                  height: box.height,
                }
              : {
                  top: active.box.top,
                  left: box.left,
                  width: box.width,
                  height: active.box.height,
                }
          }
        />
      )}

      {cols.map((g) => (
        <button
          key={`c${g.index}`}
          type="button"
          tabIndex={-1}
          title="Column options"
          aria-label={`Column ${g.index + 1} options`}
          onMouseEnter={() => setHover({ axis: "col", index: g.index, box: g.box })}
          onMouseLeave={() => setHover(null)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMenu({ axis: "col", index: g.index, box: g.box })}
          data-table-menu
          className={cn(
            "pointer-events-auto absolute rounded-[3px] transition-colors",
            active?.axis === "col" && active.index === g.index
              ? "bg-[#FF902F]"
              : "bg-black/[0.13] hover:bg-black/25"
          )}
          style={{
            top: box.top - GRIP - GAP,
            left: g.box.left,
            width: g.box.width,
            height: GRIP,
          }}
        />
      ))}

      {rows.map((g) => (
        <button
          key={`r${g.index}`}
          type="button"
          tabIndex={-1}
          title="Row options"
          aria-label={`Row ${g.index + 1} options`}
          onMouseEnter={() => setHover({ axis: "row", index: g.index, box: g.box })}
          onMouseLeave={() => setHover(null)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMenu({ axis: "row", index: g.index, box: g.box })}
          data-table-menu
          className={cn(
            "pointer-events-auto absolute rounded-[3px] transition-colors",
            active?.axis === "row" && active.index === g.index
              ? "bg-[#FF902F]"
              : "bg-black/[0.13] hover:bg-black/25"
          )}
          style={{
            top: g.box.top,
            left: box.left - GRIP - GAP,
            width: GRIP,
            height: g.box.height,
          }}
        />
      ))}

      {/* append affordances: the common case shouldn't need a menu */}
      <Append
        title="Add column"
        style={{ top: box.top - GRIP - GAP - 3, left: box.left + box.width + 6 }}
        onClick={() => lastCol && run("col", lastCol.cell, "after")}
      />
      <Append
        title="Add row"
        style={{ top: box.top + box.height + 6, left: box.left - GRIP - GAP - 3 }}
        onClick={() => lastRow && run("row", lastRow.cell, "after")}
      />

      {menu && (
        <Card
          menu={menu}
          box={box}
          onInsertBefore={() =>
            run(
              menu.axis,
              (menu.axis === "col" ? cols : rows)[menu.index].cell,
              "before"
            )
          }
          onInsertAfter={() =>
            run(
              menu.axis,
              (menu.axis === "col" ? cols : rows)[menu.index].cell,
              "after"
            )
          }
          onDelete={() =>
            run(
              menu.axis,
              (menu.axis === "col" ? cols : rows)[menu.index].cell,
              "delete"
            )
          }
          canDelete={(menu.axis === "col" ? cols.length : rows.length) > 1}
        />
      )}
    </div>
  )
}

function Append({
  title,
  style,
  onClick,
}: {
  title: string
  style: React.CSSProperties
  onClick: () => void
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      data-table-menu
      className="pointer-events-auto absolute flex size-[15px] items-center justify-center rounded-full bg-black/[0.08] text-[#5c6470] transition-colors hover:bg-[#FF902F] hover:text-white"
      style={style}
    >
      <Plus size={9} weight="bold" aria-hidden />
    </button>
  )
}

function Item({
  onClick,
  danger,
  children,
}: {
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-[7px] rounded-[6px] px-[8px] py-[5px] text-left text-[13px] tracking-[-0.01em] transition-colors",
        danger
          ? "text-[#5c6470] hover:bg-[#fdecec] hover:text-[#d43c3c]"
          : "text-[#33383f] hover:bg-black/[0.05]"
      )}
    >
      {children}
    </button>
  )
}

function Card({
  menu,
  box,
  onInsertBefore,
  onInsertAfter,
  onDelete,
  canDelete,
}: {
  menu: Menu
  box: Box
  onInsertBefore: () => void
  onInsertAfter: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const col = menu.axis === "col"
  return (
    <div
      data-table-menu
      className="pointer-events-auto absolute z-[46] w-[168px] rounded-[10px] border border-black/10 bg-white p-[4px] shadow-[0px_8px_24px_-6px_rgba(0,0,0,0.28)]"
      style={
        col
          ? { top: box.top + 6, left: menu.box.left }
          : { top: menu.box.top + menu.box.height + 6, left: box.left + 6 }
      }
    >
      <Item onClick={onInsertBefore}>
        <Plus size={12} weight="bold" className="text-[#9aa1ab]" aria-hidden />
        {col ? "Insert column left" : "Insert row above"}
      </Item>
      <Item onClick={onInsertAfter}>
        <Plus size={12} weight="bold" className="text-[#9aa1ab]" aria-hidden />
        {col ? "Insert column right" : "Insert row below"}
      </Item>
      {canDelete && (
        <Item onClick={onDelete} danger>
          <Trash size={12} weight="fill" className="text-[#c2c7ce]" aria-hidden />
          {col ? "Delete column" : "Delete row"}
        </Item>
      )}
    </div>
  )
}
