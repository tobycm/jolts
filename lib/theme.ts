import type { ContentType } from "@/lib/content"

/* Per-content-type visual identity, following the header's language:
   a saturated accent, a two-tone conic checkerboard, and a "wash"
   gradient that fades the checker out toward one edge. Builds inherit the
   orange/yellow family from the "Start here!" card; the blue family stays
   reserved for site chrome (header, search).

   Every value is a CSS variable, defined once per theme in globals.css.
   Nothing here resolves to a literal color, which is what lets the same
   server-rendered markup carry both themes with no client branching:
   `.dark` on <html> re-points the variables and the gradients below
   recompute. See globals.css for the light/dark pairs and the reasoning
   behind them. */
export type TypeTheme = {
  /** Singular label, e.g. "Build" */
  label: string
  labelPlural: string
  /** The bright one: type, icons, dots, small fills. */
  accent: string
  /** Checker chrome. Dark mode brings these down to near-surface
      luminance while `accent` stays bright - see FrameTheme. */
  frame: string
  checkerA: string
  checkerB: string
  /** rgb triplet for the wash gradient, consumed at several alphas */
  wash: string
  /** Soft glow behind hero art and card display windows. */
  tint: string
  /** Bright checker pair for small decorative marks. The frame pair is
      deepened in dark mode, which a 7px rule cannot survive. */
  tickA: string
  tickB: string
}

export const typeTheme: Record<ContentType, TypeTheme> = {
  guides: {
    label: "Guide",
    labelPlural: "Guides",
    accent: "var(--jt-guides-accent)",
    frame: "var(--jt-guides-frame)",
    checkerA: "var(--jt-guides-checker-a)",
    checkerB: "var(--jt-guides-checker-b)",
    wash: "var(--jt-guides-wash)",
    tint: "var(--jt-guides-tint)",
    tickA: "var(--jt-guides-tick-a)",
    tickB: "var(--jt-guides-tick-b)",
  },
  concepts: {
    label: "Concept",
    labelPlural: "Concepts",
    accent: "var(--jt-concepts-accent)",
    frame: "var(--jt-concepts-frame)",
    checkerA: "var(--jt-concepts-checker-a)",
    checkerB: "var(--jt-concepts-checker-b)",
    wash: "var(--jt-concepts-wash)",
    tint: "var(--jt-concepts-tint)",
    tickA: "var(--jt-concepts-tick-a)",
    tickB: "var(--jt-concepts-tick-b)",
  },
  tools: {
    label: "Tool",
    labelPlural: "Tools",
    accent: "var(--jt-tools-accent)",
    frame: "var(--jt-tools-frame)",
    checkerA: "var(--jt-tools-checker-a)",
    checkerB: "var(--jt-tools-checker-b)",
    wash: "var(--jt-tools-wash)",
    tint: "var(--jt-tools-tint)",
    tickA: "var(--jt-tools-tick-a)",
    tickB: "var(--jt-tools-tick-b)",
  },
  /* Site pages borrow the guides family on purpose: "Start here" is the
     door into the builds, and the header's Start here card is already
     bordered in the same orange. */
  pages: {
    label: "Page",
    labelPlural: "Pages",
    accent: "var(--jt-guides-accent)",
    frame: "var(--jt-guides-frame)",
    checkerA: "var(--jt-guides-checker-a)",
    checkerB: "var(--jt-guides-checker-b)",
    wash: "var(--jt-guides-wash)",
    tint: "var(--jt-guides-tint)",
    tickA: "var(--jt-guides-tick-a)",
    tickB: "var(--jt-guides-tick-b)",
  },
}

/* Site chrome - the header's nav dropdown, search, and the editor's save
   dialog - keeps the blue family. It's the one palette not tied to a content
   type, which is what makes those surfaces read as "the site talking" rather
   than "this guide". Shaped to drop straight into CheckerFrame. */
export const chromeTheme = {
  accent: "var(--jt-chrome-accent)",
  frame: "var(--jt-chrome-frame)",
  checkerA: "var(--jt-chrome-checker-a)",
  checkerB: "var(--jt-chrome-checker-b)",
  wash: "var(--jt-chrome-wash)",
}

export const difficultyLabel = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
} as const

export const difficultyLevel = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
} as const
