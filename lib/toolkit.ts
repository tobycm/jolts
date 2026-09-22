/* The "what software" picker's data and rules, pure and fs-free so both the
   picker UI (components/mdx/toolkit-picker) and the shared answer context
   (components/mdx/toolkit-context) can import them.

   A beginner opening "what software do I need?" gets a wall of names - KiCad,
   EasyEDA, Thonny, Arduino, Onshape - and no way to tell which is for them.
   Three questions narrow it to one app per job. The questions come from the
   MDX so the page can reword them; the rules meet the answers at the question
   ids (device / lang / pref) and at keywords in the option text
   ("chromebook", "phone", "python"), matched loosely so rewording an option
   doesn't silently change the answer - see readTraits. */

export type ToolkitQuestion = {
  /** must be one of the ids readTraits reads: device, lang, pref */
  id: string
  prompt: string
  options: string[]
}

export type Answers = Record<string, string>

/** The three ids readTraits reads; a recommendation only exists once all
    three are answered. */
export const QUESTION_IDS = ["device", "lang", "pref"] as const

/* ---------- the apps ---------- */

export type AppRef = {
  name: string
  href: string
  /** one line: what it is and why it's the pick */
  why: string
  /** the app's own icon in public/app-icons; its basename is the slug that
      an <App> header carries, which is how a header knows it's a pick */
  icon: string
}

export type App = AppRef & {
  /** the second half of a pairing, e.g. the editor a language needs */
  also?: AppRef
  /** the honest caveat, when the pick is a compromise */
  caveat?: string
}

/** The app-icons basename, which is the slug shared with <App name>. */
export function slugOf(app: AppRef): string {
  return app.icon.replace("/app-icons/", "").replace(".png", "")
}

const KICAD: App = {
  name: "KiCad",
  href: "https://www.kicad.org/",
  icon: "/app-icons/kicad.png",
  why: "Free AND open source! KiCad is what most Hack Clubbers draw their PCBs in. Recommended over EasyEDA as it's more capable.",
}

const EASYEDA: App = {
  name: "EasyEDA",
  href: "https://easyeda.com/",
  icon: "/app-icons/easyeda.png",
  why: "It's free and runs entirely in a browser tab! It's worth checking out KiCad if you can as it's more capable and beginner friendly at the same time.",
}

const CIRCUITPYTHON: App = {
  name: "CircuitPython",
  href: "https://circuitpython.org/",
  icon: "/app-icons/circuitpython.png",
  why: "It's very easy to use and capable at the same time!",
}

const THONNY: AppRef = {
  name: "Thonny",
  href: "https://thonny.org/",
  icon: "/app-icons/thonny.png",
  why: "A small editor that talks to the circuit board and gives you a Python prompt",
}

const CP_WEB_EDITOR: AppRef = {
  name: "the CircuitPython web editor",
  href: "https://code.circuitpython.org/",
  icon: "/app-icons/circuitpython.png",
  why: "Edits the board straight from Chrome, so nothing needs installing.",
}

const ARDUINO: App = {
  name: "Arduino IDE",
  href: "https://www.arduino.cc/en/software",
  icon: "/app-icons/arduino.png",
  why: "It's free! You'll be writing C++, and most parts you buy come with Arduino example code you can copy from. If C++ gets painful, CircuitPython is the easier way in.",
}

const ARDUINO_CLOUD: App = {
  name: "Arduino Cloud Editor",
  href: "https://www.arduino.cc/en/software",
  icon: "/app-icons/arduino.png",
  why: "Same C++ as the Arduino IDE, just in a browser tab! You'll need an Arduino account, but there's nothing to install.",
}

const ONSHAPE: App = {
  name: "Onshape",
  href: "https://www.onshape.com/",
  icon: "/app-icons/onshape.png",
  why: "3D CAD that runs in browser. It takes a bit of learning, but then you can draw a case without having to instally heavy tools.",
  caveat: "The free plan makes your designs public.",
}

const FUSION: App = {
  name: "Fusion",
  href: "https://www.autodesk.com/products/fusion-360/personal",
  icon: "/app-icons/fusion.png",
  why: "Free for personal use. It's a quite large install size though.",
  caveat: "You'll need an Autodesk account, and there's no Linux version.",
}

/* ---------- what the answers mean ---------- */

type Traits = {
  /** browser apps only, by necessity or by choice */
  browser: boolean
  avoidsBrowser: boolean
  phone: boolean
  codes: "python" | "other" | "none"
}

function readTraits(answers: Answers): Traits {
  const device = answers.device ?? ""
  const lang = answers.lang ?? ""
  const pref = answers.pref ?? ""

  const phone = /phone|tablet|ipad/i.test(device)
  const chromebook = /chromebook/i.test(device)

  return {
    browser: phone || chromebook || /^y/i.test(pref),
    avoidsBrowser: !phone && !chromebook && /^n/i.test(pref),
    phone,
    codes: /python/i.test(lang)
      ? "python"
      : /^n/i.test(lang)
        ? "none"
        : "other",
  }
}

/* ---------- the rules ---------- */

/* One pick per job, and the job names match this page's own sections. */
export const PICKS: { job: string; pick: (t: Traits) => App }[] = [
  {
    job: "Circuit boards",
    pick: (t) => {
      if (t.phone) {
        return {
          ...EASYEDA,
          caveat:
            "Board design on a phone screen is hard!! Do continue reading and come back on a laptop or a Chromebook :D",
        }
      }
      return t.browser ? EASYEDA : KICAD
    },
  },
  {
    job: "Code",
    pick: (t) => {
      if (t.codes === "other") return t.browser ? ARDUINO_CLOUD : ARDUINO
      return {
        ...CIRCUITPYTHON,
        why:
          t.codes === "none"
            ? "Nothing to set up: the board turns up as a USB drive, you edit code.py, and it runs."
            : CIRCUITPYTHON.why,
        also: t.browser ? CP_WEB_EDITOR : THONNY,
      }
    },
  },
  {
    job: "3D parts",
    pick: (t) => {
      if (t.avoidsBrowser) return FUSION
      if (t.phone) {
        return {
          ...ONSHAPE,
          caveat:
            "It loads on a phone! However drawing a case on one is quite impossible",
        }
      }
      return ONSHAPE
    },
  },
]

/** Run the picks against the current answers. Returns the picked App per
    job, in the same order as PICKS. */
export function recommendedApps(answers: Answers): App[] {
  const traits = readTraits(answers)
  return PICKS.map((p) => p.pick(traits))
}

/** The slugs of the recommended apps - what an <App> header checks to
    decide whether it's a pick. Empty until every question is answered, so a
    half-filled picker never lights up a header. */
export function recommendedSlugs(answers: Answers): Set<string> {
  if (!QUESTION_IDS.every((id) => answers[id])) return new Set()
  return new Set(recommendedApps(answers).map(slugOf))
}
