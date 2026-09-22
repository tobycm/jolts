"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  ArrowElbowDownLeft,
  FileText,
  HashStraight,
  MagnifyingGlass,
  Moon,
  Sun,
} from "@phosphor-icons/react"
import { usePathname, useRouter } from "next/navigation"
import MiniSearch from "minisearch"

import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { CheckerFrame } from "@/components/checker-frame"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Command as CommandPrimitive } from "cmdk"
import { useThemeMode } from "@/components/theme-mode"
import { chromeTheme } from "@/lib/theme"
import { themeable } from "@/lib/theme-mode"
import { cn } from "@/lib/utils"

/* Site search: a command palette in the navigation dropdown's blue
   checker chrome, DocSearch-style - grouped results, two-line items,
   kbd footer. The index is a static JSON route, fetched once on first
   open and cached for the session. Opens from the header button or
   Ctrl/Cmd+K.

   Ranking is MiniSearch, not cmdk. cmdk's built-in filter scores
   characters rather than words, so it matches scattered letters across a
   row's whole value and buries the real answer under near-misses. Here it
   runs with shouldFilter={false} and does only what it is good at -
   roving selection and keyboard nav - over a list ordered in this file. */

type SearchDoc = {
  href: string
  title: string
  crumb: string
  group: string
  kind: "page" | "section"
  text: string
}

/** A doc plus the id MiniSearch keys results by: its index in the array. */
type Indexed = SearchDoc & { id: number }

let cachedDocs: Indexed[] | null = null
let cachedIndex: MiniSearch<Indexed> | null = null

function buildIndex(docs: Indexed[]): MiniSearch<Indexed> {
  const index = new MiniSearch<Indexed>({
    fields: ["title", "crumb", "text"],
    /* Nothing is stored: hits come back as ids and we read the doc out of
       the array, so the corpus lives in memory exactly once. */
    storeFields: [],
    searchOptions: {
      boost: { title: 5, crumb: 2 },
      // match half-typed words; MIN_QUERY keeps this off a lone letter
      prefix: true,
      /* Typo tolerance only where a typo is plausible. Short electronics
         terms ("i2c", "5v", "gnd") stay exact or they collide. */
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      /* Every word has to match something. This is the precision knob
         cmdk was missing. */
      combineWith: "AND",
    },
  })
  index.addAll(docs)
  return index
}

/* A single letter can't say anything useful about an electronics guide, so
   the browse list stays up until the second character. It also keeps prefix
   matching from having to answer "everything starting with i". */
const MIN_QUERY = 2
const RESULT_LIMIT = 30
const SNIPPET_TAIL = 100
const SNIPPET_LEAD = 32

/** The stretch of prose around the first matched term, so a result's
    second line shows why it matched instead of the same opening every
    time. Null when the match was in the title or crumb only. */
function snippetAround(text: string, terms: string[]) {
  if (!text) return null
  const haystack = text.toLowerCase()
  let at = -1
  let length = 0
  for (const term of terms) {
    const found = haystack.indexOf(term.toLowerCase())
    if (found !== -1 && (at === -1 || found < at)) {
      at = found
      length = term.length
    }
  }
  if (at === -1) return null

  let from = Math.max(0, at - SNIPPET_LEAD)
  if (from > 0) {
    // open on a word boundary rather than mid-word
    const space = text.indexOf(" ", from)
    from = space !== -1 && space < at ? space + 1 : from
  }
  return {
    lead: (from > 0 ? "…" : "") + text.slice(from, at),
    hit: text.slice(at, at + length),
    tail: text.slice(at + length, at + length + SNIPPET_TAIL),
  }
}

type Result = {
  doc: Indexed
  snippet: ReturnType<typeof snippetAround>
}

const GROUP_ORDER = ["Guides", "Concepts", "Tools", "Pages"]

/* ---------- commands ---------- */

/* The palette is the only place the theme can be switched, which makes it
   more than a search box: rows can be actions as well as destinations. One
   action so far, so this is a shape rather than a framework - `terms` is
   what a searcher might plausibly type to find it. */
type Command = {
  id: string
  title: string
  hint: string
  terms: string[]
  icon: React.ReactNode
  run: () => void
}

const COMMANDS_HEADING = "Appearance"

/* Shared by result rows and command rows so an action never looks like a
   different kind of thing from a destination. */
const GROUP_CLASS =
  "p-0 pt-[6px] **:[[cmdk-group-heading]]:px-[10px] **:[[cmdk-group-heading]]:pb-[4px] **:[[cmdk-group-heading]]:text-[11.5px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:tracking-[0.02em] **:[[cmdk-group-heading]]:text-[var(--jt-faint)] **:[[cmdk-group-heading]]:uppercase"

const ROW_CLASS = cn(
  "group/result mx-0 my-[2px] flex items-center gap-[11px] rounded-[8px] px-[10px] py-[8px]",
  "data-selected:bg-[var(--jt-chrome-select)] data-selected:text-white",
  // hide the base component's trailing check icon
  "[&>svg:last-child]:hidden"
)

function matchCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase()
  if (!q) return commands
  const words = q.split(/\s+/)
  return commands.filter((c) => {
    const hay = [c.title, ...c.terms].join(" ").toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

/* Groups come out ordered by their best-scoring member, so the first row
   of the list is always the strongest match site-wide. A fixed group order
   would be steadier to look at but can bury the answer three headings
   down, which was the old palette's worst habit. */
function rank(
  index: MiniSearch<Indexed>,
  docs: Indexed[],
  query: string
): [string, Result[]][] {
  const groups = new Map<string, Result[]>()
  for (const hit of index.search(query).slice(0, RESULT_LIMIT)) {
    const doc = docs[hit.id as number]
    if (!doc) continue
    const list = groups.get(doc.group) ?? []
    list.push({ doc, snippet: snippetAround(doc.text, hit.terms) })
    groups.set(doc.group, list)
  }
  return [...groups.entries()]
}

/* Empty query: the pages, not every section on the site. Listing all of
   the section rows up front is a wall of text nobody reads. */
function browse(docs: Indexed[]): [string, Result[]][] {
  const groups = new Map<string, Result[]>()
  for (const doc of docs) {
    if (doc.kind !== "page") continue
    const list = groups.get(doc.group) ?? []
    list.push({ doc, snippet: null })
    groups.set(doc.group, list)
  }
  return [...groups.entries()].sort(
    (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0])
  )
}

export function SearchButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [docs, setDocs] = useState<Indexed[] | null>(cachedDocs)
  const [selected, setSelected] = useState("")
  const router = useRouter()
  const pathname = usePathname()
  const theme = useThemeMode()

  /* Dark is a reading-site thing, so on the editor and the review queue
     there is no command to offer. */
  const commands: Command[] = themeable(pathname)
    ? [
        {
          id: "theme",
          title: theme.mode === "dark" ? "Light theme" : "Dark theme",
          hint: "Appearance",
          terms: ["theme", "dark", "light", "appearance", "mode", "night"],
          icon:
            theme.mode === "dark" ? (
              <Sun size={17} weight="fill" aria-hidden />
            ) : (
              <Moon size={17} weight="fill" aria-hidden />
            ),
          run: () => theme.toggle(),
        },
      ]
    : []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!open || cachedDocs) return
    fetch("/search-index.json")
      .then((r) => r.json())
      .then((data: SearchDoc[]) => {
        cachedDocs = data.map((doc, id) => ({ ...doc, id }))
        cachedIndex = buildIndex(cachedDocs)
        setDocs(cachedDocs)
      })
      .catch(() => setDocs([]))
  }, [open])

  const groups = useMemo(() => {
    if (!docs?.length) return []
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY) return browse(docs)
    cachedIndex ??= buildIndex(docs)
    return rank(cachedIndex, docs, trimmed)
  }, [docs, query])

  /* Commands lead when the query actually names one ("dark", "theme") and
     trail the content when it doesn't - browsing is about the guides. */
  const trimmed = query.trim()
  const matchedCommands = trimmed ? matchCommands(commands, trimmed) : commands
  /* An action only jumps the queue when the query is visibly reaching for
     it - "dar", "theme", "night". On an empty palette, and on a query that
     merely happens to touch one of its terms, the content leads and Enter
     still opens the top guide. */
  const commandsLead =
    trimmed.length > 0 &&
    matchedCommands.some((c) =>
      c.terms.some((t) => t.startsWith(trimmed.toLowerCase()))
    )

  /* cmdk leaves its selection where it was when the list changes under it,
     stranding the highlight on a row that has scrolled away - and on the
     very first open it highlights nothing at all, so Enter is dead. Pin the
     highlight to the top result whenever the result set is rebuilt: on each
     keystroke, and once when the index finishes loading. Adjusted during
     render rather than in an effect so the list never paints unpinned. */
  const topId = groups[0]?.[1][0]?.doc.id
  const topValue = commandsLead
    ? `cmd:${matchedCommands[0]!.id}`
    : topId === undefined
      ? matchedCommands[0]
        ? `cmd:${matchedCommands[0].id}`
        : ""
      : String(topId)
  const resultsKey = `${docs?.length ?? 0}:${query}:${matchedCommands.length}`
  // "" can never be a resultsKey, so the first render always pins
  const [lastKey, setLastKey] = useState("")
  if (lastKey !== resultsKey) {
    setLastKey(resultsKey)
    setSelected(topValue)
  }

  /* The other half of that fix. cmdk keeps the selected row in view by
     calling scrollIntoView on it, so as the results churn under you the
     list scrolls itself to wherever the highlight ended up - which reads as
     the palette lurching downwards mid-word. The highlight is pinned to the
     top row above, so send the scroll position back with it. */
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [resultsKey])

  const empty =
    docs !== null && groups.length === 0 && matchedCommands.length === 0

  const commandGroup = matchedCommands.length > 0 && (
    <CommandGroup
      key="commands"
      heading={COMMANDS_HEADING}
      className={GROUP_CLASS}
    >
      {matchedCommands.map((command) => (
        <CommandItem
          key={command.id}
          value={`cmd:${command.id}`}
          onSelect={() => {
            command.run()
            setOpen(false)
            setQuery("")
          }}
          className={ROW_CLASS}
        >
          <span className="shrink-0 text-[var(--jt-faint)] group-data-selected/result:text-white/80!">
            {command.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium tracking-[-0.01em] text-[var(--jt-ink)] group-data-selected/result:text-white">
              {command.title}
            </span>
            <span className="block truncate text-[12px] tracking-[-0.01em] text-[var(--jt-faint)] group-data-selected/result:text-white/70">
              {command.hint}
            </span>
          </span>
          <ArrowElbowDownLeft
            size={14}
            weight="bold"
            className="shrink-0 text-transparent group-data-selected/result:text-white/80!"
            aria-hidden
          />
        </CommandItem>
      ))}
    </CommandGroup>
  )

  return (
    <>
      <button
        type="button"
        aria-label="Search (Ctrl+K)"
        onClick={() => setOpen(true)}
        className={className}
      >
        <MagnifyingGlass
          size={22}
          weight="bold"
          aria-hidden
          className="relative z-10 text-white [filter:drop-shadow(0px_1.5px_4px_rgba(0,0,0,0.35))]"
        />
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          // reopening starts clean, not on the last search
          if (!next) setQuery("")
        }}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogContent
          showCloseButton={false}
          className="top-[14%] w-full max-w-[calc(100%-2rem)] translate-y-0 gap-0 bg-transparent p-0 ring-0 sm:max-w-[580px]"
        >
          {/* same chrome as the nav dropdown and the save dialog */}
          <CheckerFrame
            theme={chromeTheme}
            checkerSize={150}
            className="shadow-[0px_10px_40px_-6px_rgba(0,0,0,0.4)]"
          >
            <div className="relative overflow-hidden rounded-[7px] bg-[var(--jt-surface)] shadow-[0px_3px_5px_0px_rgba(0,0,0,0.2)]">
              <Command
                className="rounded-none! bg-[var(--jt-surface)] p-0"
                loop
                shouldFilter={false}
                value={selected}
                onValueChange={setSelected}
              >
                {/* input row */}
                <div className="flex items-center gap-[10px] border-b border-[var(--jt-line-soft)] px-[16px]">
                  <MagnifyingGlass
                    size={18}
                    weight="bold"
                    className="shrink-0 text-[var(--jt-chrome-accent)]"
                    aria-hidden
                  />
                  <CommandPrimitive.Input
                    autoFocus
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search guides, concepts, tools…"
                    className="h-[52px] w-full bg-transparent text-[15.5px] tracking-[-0.01em] text-[var(--jt-ink)] outline-none placeholder:text-[var(--jt-faint)]"
                  />
                  <kbd className="shrink-0 rounded-[5px] border border-[var(--jt-line)] bg-[var(--jt-raise)] px-[6px] py-[2px] text-[11px] font-medium text-[var(--jt-faint)]">
                    esc
                  </kbd>
                </div>

                <CommandList
                  ref={listRef}
                  className="max-h-[380px] scroll-py-2 p-[6px]"
                >
                  {/* ours, not CommandEmpty - that one is tied to cmdk's
                      filter, which is off. role=presentation keeps a
                      non-option out of the listbox. */}
                  {(docs === null || empty) && (
                    <div
                      role="presentation"
                      className="py-[32px] text-center text-[14px] tracking-[-0.01em] text-[var(--jt-faint)]"
                    >
                      {docs === null ? (
                        "Loading…"
                      ) : query.trim() ? (
                        <>
                          No results for{" "}
                          <span className="font-medium text-[var(--jt-ink)]">
                            {query.trim()}
                          </span>
                          {/* Wikipedia's move: the page you searched for
                              and didn't find is one click from existing */}
                          <a
                            href={`/edit/new?title=${encodeURIComponent(query.trim())}`}
                            className="mt-[10px] block text-[13px] font-semibold text-[var(--jt-guides-accent)] hover:underline [text-underline-offset:3px]"
                          >
                            Write &ldquo;{query.trim()}&rdquo; yourself →
                          </a>
                        </>
                      ) : (
                        // blank query and still nothing: the index failed to load
                        "Search is unavailable right now."
                      )}
                    </div>
                  )}
                  {commandsLead && commandGroup}
                  {groups.map(([group, items]) => (
                    <CommandGroup
                      key={group}
                      heading={group}
                      className={GROUP_CLASS}
                    >
                      {items.map(({ doc, snippet }) => (
                        <CommandItem
                          key={doc.id}
                          value={String(doc.id)}
                          onSelect={() => {
                            setOpen(false)
                            setQuery("")
                            router.push(doc.href)
                          }}
                          className={ROW_CLASS}
                        >
                          {/* The icon colours need `!`: the base CommandItem
                              carries data-selected:*:[svg]:text-foreground,
                              which lands on `.item[data-selected] > svg` and
                              outweighs a group-data-selected variant, painting
                              both icons near-black on the blue row. */}
                          {doc.kind === "page" ? (
                            <FileText
                              size={17}
                              weight="regular"
                              className="shrink-0 text-[var(--jt-faint)] group-data-selected/result:text-white/80!"
                              aria-hidden
                            />
                          ) : (
                            <HashStraight
                              size={16}
                              weight="bold"
                              className="ml-[2px] shrink-0 text-[var(--jt-fainter)] group-data-selected/result:text-white/70!"
                              aria-hidden
                            />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium tracking-[-0.01em] text-[var(--jt-ink)] group-data-selected/result:text-white">
                              {doc.title}
                            </span>
                            <span className="block truncate text-[12px] tracking-[-0.01em] text-[var(--jt-faint)] group-data-selected/result:text-white/70">
                              {snippet ? (
                                <>
                                  {snippet.lead}
                                  <mark className="bg-transparent font-semibold text-[var(--jt-ink)] group-data-selected/result:text-white">
                                    {snippet.hit}
                                  </mark>
                                  {snippet.tail}
                                </>
                              ) : (
                                doc.crumb
                              )}
                            </span>
                          </span>
                          <ArrowElbowDownLeft
                            size={14}
                            weight="bold"
                            className="shrink-0 text-transparent group-data-selected/result:text-white/80!"
                            aria-hidden
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                  {!commandsLead && commandGroup}
                </CommandList>

                {/* footer */}
                <div className="flex items-center gap-[14px] border-t border-[var(--jt-line-soft)] px-[14px] py-[8px] text-[11.5px] tracking-[-0.01em] text-[var(--jt-faint)]">
                  <span className="flex items-center gap-[5px]">
                    <kbd className="rounded-[4px] border border-[var(--jt-line)] bg-[var(--jt-raise)] px-[4px] py-[1px] font-medium">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-[5px]">
                    <kbd className="rounded-[4px] border border-[var(--jt-line)] bg-[var(--jt-raise)] px-[4px] py-[1px] font-medium">↵</kbd>
                    open
                  </span>
                  {/* AugiePixel: a bitmap face, so no faux-bold to smear the
                      pixel grid and no negative tracking to collide it. Sized
                      up from the footer's 11.5px because pixel fonts read
                      small at a given em. */}
                  <span className="ml-auto font-augie text-[15px] text-[var(--jt-ink)]">
                    jolts
                  </span>
                </div>
              </Command>
            </div>
          </CheckerFrame>
        </DialogContent>
      </Dialog>
    </>
  )
}
