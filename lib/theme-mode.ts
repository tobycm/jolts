/* Light or dark, chosen explicitly and never inferred.

   The system preference is deliberately ignored: this site's identity is
   large areas of saturated checkerboard, and which of the two versions a
   reader wants is not something prefers-color-scheme can answer. The
   choice is made in the command palette and remembered here.

   Dark applies to the reading site only. The visual editor and the review
   queue are tool surfaces with their own colors; they stay light, so the
   class never goes on for their routes and the palette doesn't offer the
   command there. */

export type ThemeMode = "light" | "dark"

export const THEME_KEY = "jolts-theme"
export const DEFAULT_MODE: ThemeMode = "light"

/** Route prefixes that are always light. */
export const LIGHT_ONLY = ["/edit", "/review"]

export function themeable(pathname: string): boolean {
  return !LIGHT_ONLY.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function readMode(): ThemeMode {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"
  } catch {
    return DEFAULT_MODE
  }
}

export function writeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* private mode, quota, whatever - the class still flips for this tab */
  }
}

export function applyMode(mode: ThemeMode, pathname: string) {
  const on = mode === "dark" && themeable(pathname)
  document.documentElement.classList.toggle("dark", on)
}

/** Broadcast so every mounted reader (the palette's label) re-reads. */
export const THEME_EVENT = "jolts:theme"

/* Runs synchronously at the top of <body>, before anything paints, so a
   dark reader never sees a white flash. Kept in one string here so the
   storage key and the light-only route list can't drift from the module
   above. */
export const themeBootScript = `try{
var m=localStorage.getItem(${JSON.stringify(THEME_KEY)});
var p=location.pathname;
var light=${JSON.stringify(LIGHT_ONLY)}.some(function(x){return p===x||p.indexOf(x+"/")===0});
if(m==="dark"&&!light)document.documentElement.classList.add("dark");
}catch(e){}`.replace(/\n/g, "")
