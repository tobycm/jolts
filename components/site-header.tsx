"use client"

import { useEffect, useRef, useState } from "react"

import {
  ArrowUpRight,
  BookOpenText,
  CaretDown,
  Lightbulb,
  Package,
  Wrench,
  type Icon,
} from "@phosphor-icons/react"

import { SearchButton } from "@/components/search-command"
import { AnimatePresence, motion, useMotionValue } from "motion/react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

/* Scale notes: header chrome is Figma (1920 frame) × 0.73, the navigation
   pill and its dropdown panels are Figma × 0.8.

   Three widths: at `lg` and up everything is at full scale; between `md`
   and `lg` the chrome steps down and the pill segments drop their labels,
   keeping only icons; below `md` the pill is replaced by the hamburger
   panel (MobileNav). */

/* Pill segment. Hover previews the same white gradient + underline the open
   state uses - no separate hover tint - so the trigger reads as one motion
   when the panel opens (Root has delay={0}). The gradient lives on a ::before
   overlay (background-image itself cannot transition) so it can fade in fast;
   the ::after underline fades on the same clock. Class names are written out
   in full because Tailwind's scanner only sees complete literals. */
const segmentClass = cn(
  "jolts-glow relative flex h-full w-max cursor-pointer items-center rounded-none px-[14px] lg:px-[17px]",
  "text-[19px] font-semibold tracking-[-0.03em] text-white lg:text-[22.4px]",
  "bg-transparent hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:outline-none",
  "data-popup-open:bg-transparent data-popup-open:hover:bg-transparent data-popup-open:focus:bg-transparent",
  "data-open:bg-transparent data-open:hover:bg-transparent data-open:focus:bg-transparent",
  // gradient overlay - brightness overshoot handled by .jolts-glow
  // (stops raised so the 0.72 resting opacity matches the old look)
  "before:pointer-events-none before:absolute before:inset-0",
  "before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_0%,rgba(255,255,255,0.55)_92%,rgba(255,255,255,0.85)_100%)]",
  // underline
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[var(--jt-surface)] after:opacity-0 after:transition-opacity after:duration-150 after:ease-out",
  "hover:after:opacity-100 data-popup-open:after:opacity-100"
)

/* Only the outermost segments bleed their gradient/underline past the pill's
   7px edge padding, so the effect meets the pill's rounded corners without
   spilling into the gaps between neighbouring items. */
const bleedLeftClass = "before:-left-[7px] after:-left-[7px]"
const bleedRightClass = "before:-right-[7px] after:-right-[7px]"

/* Drop shadow lives on the icon+label row, NOT the whole segment - on the
   segment it would also shadow the white gradient rectangle and smear a dark
   rim around the text. z-10 keeps the row above the gradient overlay. */
const segmentContentClass =
  "relative z-10 flex items-center gap-[8px] lg:gap-[10px] [filter:drop-shadow(0px_1.5px_4px_rgba(0,0,0,0.35))]"

/* The blue checker border chrome and the white surface live on the POPUP and
   VIEWPORT (see popupClassName / viewportClassName on <NavigationMenu>), not
   inside each panel - the popup is the element whose size actually animates
   during a panel-to-panel morph, so chrome attached to it stretches smoothly
   instead of clipping or flashing white. Panels below are pure content. */
const popupChromeClass = cn(
  "overflow-hidden rounded-[14px] bg-[var(--jt-chrome-accent)] p-[6px] text-foreground ring-0",
  "shadow-[0px_3px_13px_0px_rgba(0,0,0,0.25)]",
  // rotated blue checkerboard, same family as the header's
  "before:absolute before:-inset-[60%] before:rotate-[-16.06deg]",
  "before:[background-image:conic-gradient(var(--jt-chrome-checker-a)_0_25%,var(--jt-chrome-checker-b)_0_50%,var(--jt-chrome-checker-a)_0_75%,var(--jt-chrome-checker-b)_0)]",
  "before:[background-size:180px_180px]",
  // cyan gradient that deepens toward the bottom
  "after:absolute after:inset-0 after:bg-gradient-to-b after:from-transparent after:to-[var(--jt-chrome-wash-to)]"
)

const viewportChromeClass =
  "z-10 rounded-[8px] bg-[var(--jt-surface)] shadow-[0px_3px_5px_0px_rgba(0,0,0,0.25)]"

/* One hoverable link row - shared by every panel's item list. */
function PanelItem({
  title,
  description,
  descriptionClass,
  href = "#",
}: {
  title: string
  description: string
  descriptionClass?: string
  href?: string
}) {
  const external = href.startsWith("http")
  return (
    <NavigationMenuLink
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex-col items-start gap-[2px] rounded-[8px] px-[12px] py-[9px] hover:bg-[var(--jt-fill)] focus:bg-[var(--jt-fill)] active:bg-[var(--jt-fill)]"
    >
      <span className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        {title}
      </span>
      <span
        className={cn(
          "text-[12px] leading-[normal] tracking-[-0.03em] text-[var(--jt-faint)]",
          descriptionClass
        )}
      >
        {description}
      </span>
    </NavigationMenuLink>
  )
}

/* "Check out all …" footer button - shared by every panel. */
function PanelFooter({
  children,
  href = "#",
}: {
  children: React.ReactNode
  href?: string
}) {
  return (
    <NavigationMenuLink
      href={href}
      className="mt-auto flex h-[36px] w-full shrink-0 items-center justify-center gap-[6px] rounded-[7px] bg-[var(--jt-fill)] p-0 text-[13px] font-medium tracking-[-0.03em] text-[var(--jt-muted)] hover:bg-[var(--jt-fill-hover)] focus:bg-[var(--jt-fill-hover)] active:bg-[var(--jt-fill-hover)]"
    >
      {children}
      <ArrowUpRight size={12} weight="bold" aria-hidden />
    </NavigationMenuLink>
  )
}

type NavSection = {
  label: string
  icon: Icon
  iconSize: number
  footer: string
  footerHref?: string
  items: { title: string; description: string; href?: string }[]
}

/* Guides are their own thing on desktop - the section gets an illustrated
   panel instead of a plain item list - but the rows are the same rows, so
   they live here and GuidesPanel and MobileNav both read them. */
const guideItems = [
  {
    title: "Macropad",
    description: "Build a tiny keyboard. Design, solder, and use it everyday.",
    href: "/guides/macropad",
  },
  {
    title: "Tamagotchi",
    description: "Build a pocket pet from scratch!",
    href: "/guides/tamagotchi",
  },
  {
    title: "RP2040 Devboard",
    description: "Design your own dev board - schematic to fab.",
    href: "/guides/devboard",
  },
]

const guidesSection: NavSection = {
  label: "Guides",
  icon: BookOpenText,
  iconSize: 26,
  footer: "Check out all guides",
  footerHref: "/guides",
  items: guideItems,
}

/* Optional artwork layer for the Start here! card - drop a webp in
   public/brand and point this at it. It sits between the checkerboard and
   the text, and scales up while the card is hovered. */
const CARD_FG_SRC: string | null = null

function GuidesPanel() {
  const [cardHover, setCardHover] = useState(false)
  /* Raw motion values, no spring - the pill tracks the cursor 1:1. Only the
     enter/exit fade+scale is sprung. */
  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)

  /* Pill coordinates are relative to the panel wrapper; the pill floats to
     the top-right of the cursor. */
  const placePill = (e: React.MouseEvent<HTMLElement>) => {
    const wrap = e.currentTarget.parentElement
    if (!wrap) return
    const wr = wrap.getBoundingClientRect()
    cursorX.set(e.clientX - wr.left + 16)
    cursorY.set(e.clientY - wr.top - 40)
  }

  return (
    <div className="relative flex h-full w-full pt-[13px] pr-[12px] pb-[12px] pl-[14px] [perspective:900px]">
        {/* Start here! card - layers: checker bg, artwork, text, corner tab.
            Pointer-tracking tilt: mousemove writes the rotation directly so
            there is no re-render; the transform transition smooths it out. */}
        <NavigationMenuLink
          href="/start"
          className="group/card relative block h-[302px] w-[244px] shrink-0 overflow-hidden rounded-[7px] border-[3px] border-solid border-[var(--jt-guides-accent)] p-0 transition-[transform,box-shadow] duration-200 ease-out will-change-transform hover:bg-transparent hover:shadow-[0px_14px_28px_rgba(0,0,0,0.28)] focus:bg-transparent active:shadow-[0px_8px_18px_rgba(0,0,0,0.24)]"
          /* Pointer events, not mouse events, so a finger can be told apart:
             a touch would otherwise leave the card tilted and the cursor pill
             floating where it was tapped, with no unhover to clear either. */
          onPointerEnter={(e) => {
            if (e.pointerType !== "mouse") return
            placePill(e)
            setCardHover(true)
          }}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse") return
            const el = e.currentTarget
            const r = el.getBoundingClientRect()
            const x = (e.clientX - r.left) / r.width - 0.5
            const y = (e.clientY - r.top) / r.height - 0.5
            el.style.transform = `rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) scale(1.02)`
            // the light sweep rides the tilt: same pointer position drives it
            el.style.setProperty("--sweep", (x + 0.5).toFixed(3))
            placePill(e)
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.transform = ""
            e.currentTarget.style.removeProperty("--sweep")
            setCardHover(false)
          }}
        >
          {/* background: checkerboard + sunlight gradient.
              Squares and wash come from the guides family (globals.css);
              the wash is pinned to the top-right so the checker contrast
              fades out there. Sampled from the Figma render at ~54px. */}
          <div
            aria-hidden
            className="absolute -inset-[60%] rotate-[-8.66deg]"
            style={{
              backgroundImage:
                "conic-gradient(var(--jt-guides-checker-a) 0 25%, var(--jt-guides-checker-b) 0 50%, var(--jt-guides-checker-a) 0 75%, var(--jt-guides-checker-b) 0)",
              backgroundSize: "107px 107px",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(67.21deg, rgba(var(--jt-guides-wash),0) 0%, rgba(var(--jt-guides-wash),0.75) 100%)",
            }}
          />

          {/* foreground artwork - scales up on hover */}
          {CARD_FG_SRC && (
            <img
              src={CARD_FG_SRC}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover/card:scale-[1.06]"
            />
          )}

          {/* text layer - the Figma-exported vector overlay (305x377, scales
              to the card), outlines and shadows baked in */}
          <img
            src="/brand/cardtext.svg"
            alt="beginner? Start here!"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          {/* soft light sweep - its position is driven by the same pointer
              value as the tilt (--sweep, 0..1), so the sheen glides across
              the card as it tilts */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
          >
            <div className="absolute -top-[30%] -bottom-[30%] -left-[55%] w-[55%] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.32)_50%,rgba(255,255,255,0)_100%)] transition-transform duration-200 ease-out [transform:translateX(calc(var(--sweep,0.5)*300%))_rotate(20deg)]" />
          </div>

          {/* Zero To One corner tab - the Figma flag vector as a clip-path,
              built at design scale (173x34) and scaled 0.8 from the top-right
              so it sits flush with the card's corner radius. */}
          <span
            className="absolute -top-[3px] -right-[3px] flex h-[34px] w-[173px] origin-top-right scale-[0.8] items-center justify-end gap-[6px] bg-[var(--jt-guides-accent)] pr-[20px] text-[16px] font-semibold tracking-[-0.03em] text-[var(--jt-on-accent)]"
            style={{
              clipPath:
                "path('M22.3123 26.1852L11.8664 7.04281C9.49719 2.70115 4.94603 0 0 0H165C169.418 0 173 3.58172 173 8V34H35.4794C29.9913 34 24.9412 31.0028 22.3123 26.1852Z')",
            }}
          >
            Zero To One
            <ArrowUpRight size={15} weight="bold" aria-hidden />
          </span>
        </NavigationMenuLink>

        {/* cursor pill - springs in at the top-right of the pointer */}
        <AnimatePresence>
          {cardHover && (
            <motion.span
              className="pointer-events-none absolute top-0 left-0 z-30 flex h-[32px] items-center gap-[6px] rounded-[16px] rounded-bl-[5.4px] bg-[var(--jt-ink)] px-[15px] text-[14px] font-semibold tracking-[-0.03em] whitespace-nowrap text-[var(--jt-page)]"
              style={{ x: cursorX, y: cursorY, transformOrigin: "left bottom" }}
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.55 }}
              transition={{ type: "spring", stiffness: 550, damping: 30 }}
            >
              Start Here
              <ArrowUpRight size={15} weight="bold" aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>

        {/* guide links - same rows as the items-only panels */}
        <div className="flex min-w-0 flex-1 flex-col gap-[4px] pt-[6px] pl-[9px]">
          {guideItems.map((item) => (
            <PanelItem
              key={item.title}
              title={item.title}
              description={item.description}
              descriptionClass="w-[160px]"
              href={item.href}
            />
          ))}
          <PanelFooter href={guidesSection.footerHref}>
            {guidesSection.footer}
          </PanelFooter>
        </div>
    </div>
  )
}

/* Items-only panel for the remaining sections. */
function ItemsPanel({
  items,
  footer,
  footerHref,
}: {
  items: { title: string; description: string; href?: string }[]
  footer: string
  footerHref?: string
}) {
  return (
    <div className="flex w-full flex-col gap-[4px] p-[8px]">
      {items.map((item) => (
        <PanelItem
          key={item.title}
          title={item.title}
          description={item.description}
          href={item.href}
        />
      ))}
      <PanelFooter href={footerHref}>{footer}</PanelFooter>
    </div>
  )
}

const sections: NavSection[] = [
  {
    label: "Concepts",
    icon: Lightbulb,
    iconSize: 26,
    footer: "Check out all concepts",
    footerHref: "/concepts",
    items: [
      {
        title: "Electricity Basics",
        description: "Voltage, current, resistance",
        href: "/concepts/voltage",
      },
      {
        title: "I2C",
        description: "Two wires, dozens of devices",
        href: "/concepts/i2c",
      },
      {
        title: "Pull-up Resistors",
        description: "Why input pins need a default",
        href: "/concepts/pull-up-resistors",
      },
    ],
  },
  {
    label: "Tools",
    icon: Wrench,
    iconSize: 24,
    footer: "Check out all tools",
    footerHref: "/tools",
    items: [
      {
        title: "Soldering Iron",
        description: "First hour, technique, safety",
        href: "/tools/soldering-iron",
      },
      {
        title: "Multimeter",
        description: "Measuring without guessing",
        href: "/tools/multimeter",
      },
    ],
  },
  {
    label: "Library",
    icon: Package,
    iconSize: 26,
    footer: "Check out the full library",
    items: [
      {
        title: "Codex",
        description: "Hack Club's hardware reference",
        href: "https://codex.hackclub.com",
      },
      { title: "Datasheets 101", description: "How to actually read them" },
      { title: "Recommended Parts & Kits", description: "What to buy" },
    ],
  },
]

/* ---------- below md: the pill becomes a panel ---------- */

/* Same chrome as everything else in the header - the buttons that flank the
   nav (search, hamburger) share this square. */
const chromeButtonClass = cn(
  "jolts-glow relative flex cursor-pointer items-center justify-center overflow-hidden rounded-[4px] bg-[var(--jt-header-pill)]",
  "before:pointer-events-none before:absolute before:inset-0",
  "before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_0%,rgba(255,255,255,0.55)_92%,rgba(255,255,255,0.85)_100%)]",
  "active:before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.75)_92%,rgba(255,255,255,1)_100%)]",
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[var(--jt-surface)] after:opacity-0 after:transition-opacity after:duration-150 after:ease-out",
  // press first; hover is the mouse-only extra, and below md there is no
  // mouse worth designing for - same split as .jolts-glow in globals.css
  "active:after:opacity-100 md:hover:after:opacity-100"
)

/* Vertically centred in each header height (68/80/91), except at `lg`,
   where the button sits where Figma put it. */
const chromeButtonSize =
  "mt-[12px] size-[44px] md:mt-[17px] md:size-[46px] lg:mt-[25px] lg:size-[49px]"

/* A panel row. Not PanelItem: that one is a NavigationMenuLink, which only
   works inside the navigation menu's context. */
function MobileRow({
  title,
  description,
  href = "#",
  onNavigate,
}: {
  title: string
  description?: string
  href?: string
  onNavigate: () => void
}) {
  const external = href.startsWith("http")
  const className =
    "flex flex-col items-start gap-[2px] rounded-[8px] px-[12px] py-[9px] active:bg-[var(--jt-fill)]"
  const inner = (
    <>
      <span className="text-[15.5px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
        {title}
      </span>
      {description && (
        <span className="text-[12px] leading-[normal] tracking-[-0.03em] text-[var(--jt-faint)]">
          {description}
        </span>
      )}
    </>
  )
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={onNavigate}
    >
      {inner}
    </a>
  ) : (
    <Link href={href} className={className} onClick={onNavigate}>
      {inner}
    </Link>
  )
}

/* One collapsible section. Tapping the header toggles it; the section's hub
   is the "Check out all …" row, same as the desktop panels. */
function MobileSection({
  section,
  expanded,
  onToggle,
  onNavigate,
}: {
  section: NavSection
  expanded: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  return (
    <div className="border-t border-[var(--jt-line-soft)] first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center gap-[10px] rounded-[8px] px-[12px] py-[12px] text-left active:bg-[var(--jt-fill)]"
      >
        <section.icon
          size={21}
          weight="fill"
          aria-hidden
          className="shrink-0 text-[var(--jt-chrome-accent)]"
        />
        <span className="flex-1 text-[17px] font-semibold tracking-[-0.03em] text-[var(--jt-ink)]">
          {section.label}
        </span>
        <CaretDown
          size={14}
          weight="bold"
          aria-hidden
          className={cn(
            "shrink-0 text-[var(--jt-fainter)] transition-transform duration-200 ease-out",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col gap-[2px] pb-[8px] pl-[19px]">
              {section.items.map((item) => (
                <MobileRow
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  href={item.href}
                  onNavigate={onNavigate}
                />
              ))}
              {section.footerHref && (
                <Link
                  href={section.footerHref}
                  onClick={onNavigate}
                  className="mt-[4px] mr-[12px] flex h-[36px] items-center justify-center gap-[6px] rounded-[7px] bg-[var(--jt-fill)] text-[13px] font-medium tracking-[-0.03em] text-[var(--jt-muted)] active:bg-[var(--jt-fill-hover)]"
                >
                  {section.footer}
                  <ArrowUpRight size={12} weight="bold" aria-hidden />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* Three bars that fold into an X: the outer two slide to the middle row and
   cross, the middle one fades under them. Drawn here rather than swapping two
   icons, which would have to cut from one shape to the other. */
function MenuGlyph({ open }: { open: boolean }) {
  const bar =
    "absolute left-0 h-[2.5px] w-full rounded-full bg-[var(--jt-surface)] transition-[translate,rotate,opacity] duration-200 ease-out"
  return (
    <span
      aria-hidden
      className="relative z-10 h-[17px] w-[22px] [filter:drop-shadow(0px_1.5px_4px_rgba(0,0,0,0.35))]"
    >
      <span
        className={cn(bar, "top-[1px]", open && "translate-y-[6px] rotate-45")}
      />
      <span className={cn(bar, "top-[7px]", open && "opacity-0")} />
      <span
        className={cn(
          bar,
          "top-[13px]",
          open && "-translate-y-[6px] -rotate-45"
        )}
      />
    </span>
  )
}

/* Hamburger + drop-down panel, below md only. The panel is absolutely
   positioned inside the header so it hangs off the bar's bottom edge; the
   scrim below it catches taps outside. */
function MobileNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(sections[0]?.label ?? null)

  /* while the panel is up: Escape closes it, the page behind it holds still
     so the scrim stays over the same content, and widening past `md` closes
     it - the pill is back, and the scroll lock would otherwise outlive a
     panel that md:hidden has already taken off screen. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    const wide = window.matchMedia("(min-width: 48rem)")
    const onWide = () => {
      if (wide.matches) setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    wide.addEventListener("change", onWide)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      wide.removeEventListener("change", onWide)
      document.body.style.overflow = prev
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Menu"}
        aria-expanded={open}
        aria-controls="site-mobile-nav"
        onClick={() => setOpen((o) => !o)}
        className={cn(chromeButtonClass, chromeButtonSize, "ml-[8px] md:hidden")}
      >
        <MenuGlyph open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              aria-hidden
              onClick={close}
              className="absolute top-full left-0 h-screen w-full bg-[var(--jt-scrim)] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              id="site-mobile-nav"
              className="absolute top-full right-[12px] left-[12px] z-10 mt-[6px] origin-top md:hidden"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 520, damping: 38 }}
            >
              <div className={cn("relative", popupChromeClass)}>
                <div className="relative z-10 max-h-[calc(100dvh-110px)] overflow-y-auto overscroll-contain rounded-[8px] bg-[var(--jt-surface)] p-[6px] shadow-[0px_3px_5px_0px_rgba(0,0,0,0.25)]">
                  {/* the Start here! card, flattened into a banner */}
                  <Link
                    href="/start"
                    onClick={close}
                    className="relative mb-[6px] flex h-[54px] items-center gap-[8px] overflow-hidden rounded-[7px] border-[3px] border-solid border-[var(--jt-guides-accent)] px-[14px]"
                  >
                    <span
                      aria-hidden
                      className="absolute -inset-[120%] rotate-[-8.66deg]"
                      style={{
                        backgroundImage:
                          "conic-gradient(var(--jt-guides-checker-a) 0 25%, var(--jt-guides-checker-b) 0 50%, var(--jt-guides-checker-a) 0 75%, var(--jt-guides-checker-b) 0)",
                        backgroundSize: "64px 64px",
                      }}
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(67.21deg, rgba(var(--jt-guides-wash),0) 0%, rgba(var(--jt-guides-wash),0.75) 100%)",
                      }}
                    />
                    <span className="relative z-10 flex flex-1 items-center gap-[7px] text-[17px] font-semibold tracking-[-0.03em] text-white [filter:drop-shadow(0px_1.5px_3px_rgba(0,0,0,0.3))]">
                      Beginner? Start here!
                      <ArrowUpRight size={16} weight="bold" aria-hidden />
                    </span>
                  </Link>

                  {sections.map((section) => (
                    <MobileSection
                      key={section.label}
                      section={section}
                      expanded={expanded === section.label}
                      onToggle={() =>
                        setExpanded((e) =>
                          e === section.label ? null : section.label
                        )
                      }
                      onNavigate={close}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export function SiteHeader() {
  const router = useRouter()

  /* controlled dropdown state so a click can close the panel and HOLD it
     closed while the pointer merely lingers post-navigation */
  const [menuValue, setMenuValue] = useState<unknown>(null)
  const holdRef = useRef(false)

  /* clicking a pill segment flashes the glow to full brightness for a
     beat and navigates to the section's hub (hover already previews the
     dropdown, so click means "go"). Afterwards, hovering "through" the
     load doesn't count: glow and dropdown stay off until the pointer
     leaves the segment and comes back. */
  const segmentClick =
    (href?: string) => (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget
      el.classList.remove("jolts-flash")
      void el.offsetWidth // restart the animation if mid-flash
      el.classList.add("jolts-flash")

      holdRef.current = true
      setMenuValue(null)
      let gone = false
      el.addEventListener(
        "pointerleave",
        () => {
          gone = true
          holdRef.current = false
          el.classList.remove("jolts-hold")
        },
        { once: true }
      )
      setTimeout(() => {
        el.classList.remove("jolts-flash")
        if (!gone) el.classList.add("jolts-hold")
      }, 270)

      if (href) router.push(href)
    }

  return (
    <header className="relative z-40 h-[68px] w-full [view-transition-name:jolts-header] md:h-[80px] lg:h-[91px]">
      {/* checkerboard background - pure CSS, no SVG involved */}
      <div className="absolute inset-0 overflow-hidden bg-[var(--jt-header)] shadow-[0px_3px_19px_0px_var(--jt-header-shadow)]">
        {/* The plane spins about its own centre, so the further its ends
            reach sideways the further they swing off the top and bottom of
            the header - a fixed 250px overhang ran out near 2000px wide and
            the corners fell through to bare page. The overhang has to grow
            with the width instead: half the viewport times the sine of the
            tilt, plus the header's own height (100% of the clipper). */}
        <div
          aria-hidden
          className="absolute -inset-x-[10%] bg-[var(--jt-header)]"
          style={
            {
              "--tilt": "14.59deg",
              rotate: "calc(-1 * var(--tilt))",
              insetBlock: "calc(-1 * (50vw * sin(var(--tilt)) + 100%))",
              backgroundImage:
                "conic-gradient(var(--jt-header-checker-a) 0 25%, var(--jt-header-checker-b) 0 50%, var(--jt-header-checker-a) 0 75%, var(--jt-header-checker-b) 0)",
              backgroundSize: "132px 132px",
            } as React.CSSProperties
          }
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-[var(--jt-header-wash-from)] to-[var(--jt-header-wash-to)]"
        />
        <div aria-hidden className="absolute inset-0 bg-[var(--jt-header-veil)]" />
      </div>

      <div className="relative flex h-full items-start pr-[14px] pl-[18px] md:pr-[22px] md:pl-[26px] lg:pr-[35px] lg:pl-[54px]">
        {/* logo hangs below the header bar */}
        <Link
          href="/"
          className="relative z-10 mt-[10px] shrink-0 self-start md:mt-[12px]"
        >
          <img
            src="/brand/jolts-logo.svg"
            alt="Hack Club jolts - learn to build real things"
            className="h-auto w-[132px] max-w-none md:w-[164px] lg:w-[200px]"
          />
        </Link>

        <NavigationMenu
          delay={0}
          className="mt-[17px] ml-[18px] hidden max-w-none flex-none justify-start md:flex lg:mt-[24px] lg:ml-[32px]"
          sideOffset={26}
          popupClassName={popupChromeClass}
          viewportClassName={viewportChromeClass}
          value={menuValue}
          onValueChange={(v: unknown) => {
            // post-click hold: ignore hover-opens until the pointer left
            if (holdRef.current && v !== null) return
            setMenuValue(v)
          }}
        >
          <NavigationMenuList className="h-[46px] w-max flex-none justify-start gap-0 overflow-hidden rounded-[4px] bg-[var(--jt-header-pill)] px-[7px] lg:h-[54px]">
            <NavigationMenuItem className="h-full">
              <NavigationMenuTrigger
                className={cn(segmentClass, bleedLeftClass)}
                onClick={segmentClick(guidesSection.footerHref)}
              >
                <span className={segmentContentClass}>
                  <guidesSection.icon
                    size={guidesSection.iconSize}
                    weight="fill"
                    aria-hidden
                  />
                  {/* labels are the first thing to go when the bar tightens */}
                  <span className="hidden lg:inline">
                    {guidesSection.label}
                  </span>
                </span>
              </NavigationMenuTrigger>
              <NavigationMenuContent className="h-[329px] w-[476px] p-0">
                <GuidesPanel />
              </NavigationMenuContent>
            </NavigationMenuItem>

            {sections.map((section, i) => (
              <NavigationMenuItem key={section.label} className="h-full">
                <NavigationMenuTrigger
                  className={cn(
                    segmentClass,
                    i === sections.length - 1 && bleedRightClass
                  )}
                  onClick={segmentClick(section.footerHref)}
                >
                  <span className={segmentContentClass}>
                    <section.icon
                      size={section.iconSize}
                      weight="fill"
                      aria-hidden
                    />
                    <span className="hidden lg:inline">{section.label}</span>
                  </span>
                </NavigationMenuTrigger>
                <NavigationMenuContent className="w-[292px] p-0">
                  <ItemsPanel
                    items={section.items}
                    footer={section.footer}
                    footerHref={section.footerHref}
                  />
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* search, then the hamburger that replaces the pill below md */}
        <SearchButton
          className={cn(chromeButtonClass, chromeButtonSize, "ml-auto")}
        />
        <MobileNav sections={[guidesSection, ...sections]} />
      </div>
    </header>
  )
}
