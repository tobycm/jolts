"use client"

import { useEffect, useState } from "react"

import { usePathname } from "next/navigation"

import {
  applyMode,
  readMode,
  writeMode,
  THEME_EVENT,
  type ThemeMode,
} from "@/lib/theme-mode"

/* Keeps <html class="dark"> in step with the stored preference across
   client-side navigation - the boot script only runs on a hard load, and
   moving between the reading site and the editor changes whether dark
   applies at all. */
export function ThemeSync() {
  const pathname = usePathname()

  useEffect(() => {
    const sync = () => applyMode(readMode(), window.location.pathname)
    sync()
    window.addEventListener(THEME_EVENT, sync)
    // another tab changed it
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(THEME_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [pathname])

  return null
}

/** The current mode plus a setter, for the palette's theme command. */
export function useThemeMode() {
  /* Starts light on the server and on the first client render - reading
     localStorage during render would mismatch the markup. The effect below
     corrects it before anything the user can see. */
  const [mode, setMode] = useState<ThemeMode>("light")

  useEffect(() => {
    const read = () => setMode(readMode())
    read()
    window.addEventListener(THEME_EVENT, read)
    return () => window.removeEventListener(THEME_EVENT, read)
  }, [])

  const set = (next: ThemeMode) => {
    writeMode(next)
    applyMode(next, window.location.pathname)
    setMode(next)
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  return { mode, set, toggle: () => set(mode === "dark" ? "light" : "dark") }
}
