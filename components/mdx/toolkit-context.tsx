"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"

import { recommendedSlugs, type Answers } from "@/lib/toolkit"

/* The picker's answers, shared. The <ToolkitPicker> and the <App>
   headers further down the page are separate blocks in the MDX flow, so the
   answers live here, in one provider wrapping the article, rather than in the
   picker. That's what lets a header know it's the pick and float itself up. */

type Toolkit = {
  answers: Answers
  setAnswers: Dispatch<SetStateAction<Answers>>
  /** slugs of the recommended apps; empty until the picker is complete */
  recommended: Set<string>
}

const ToolkitContext = createContext<Toolkit | null>(null)

export function ToolkitProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<Answers>({})
  const recommended = useMemo(() => recommendedSlugs(answers), [answers])
  return (
    <ToolkitContext.Provider value={{ answers, setAnswers, recommended }}>
      {children}
    </ToolkitContext.Provider>
  )
}

/* A page without the provider (any guide that isn't the picker page) still
   renders an <App> fine - it just never has a recommendation. */
const EMPTY: Toolkit = {
  answers: {},
  setAnswers: () => {},
  recommended: new Set(),
}

export function useToolkit(): Toolkit {
  return useContext(ToolkitContext) ?? EMPTY
}
