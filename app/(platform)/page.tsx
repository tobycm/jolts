import type { Metadata } from "next"

import { SiteJsonLd } from "@/components/json-ld"
import { SITE_DESCRIPTION } from "@/lib/site"
import { cn } from "@/lib/utils"

/* The home page, all skeleton for now: the layout is blocked out with
   placeholder surfaces (hero, card row, list rows) so the structure can
   be judged before any real content lands. */

// title and description come from the root layout's defaults
export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-[8px] bg-[var(--jt-skeleton)]", className)}
    />
  )
}

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-[28px] pt-[40px]">
          <SiteJsonLd description={SITE_DESCRIPTION} />
          {/* hero container */}
          <div className="rounded-[14px] border border-[var(--jt-line)] p-[28px]">
            <Skeleton className="h-[14px] w-[120px]" />
            <Skeleton className="mt-[18px] h-[40px] w-[520px] max-w-full" />
            <Skeleton className="mt-[10px] h-[40px] w-[380px] max-w-[70%]" />
            <Skeleton className="mt-[22px] h-[16px] w-[440px] max-w-[85%]" />
            <Skeleton className="mt-[8px] h-[16px] w-[360px] max-w-[70%]" />
            <div className="mt-[28px] flex gap-[10px]">
              <Skeleton className="h-[42px] w-[150px] rounded-[10px]" />
              <Skeleton className="h-[42px] w-[120px] rounded-[10px]" />
            </div>
          </div>

          {/* featured guides row */}
          <Skeleton className="mt-[52px] h-[22px] w-[160px]" />
          <div className="mt-[16px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[10px] border border-[var(--jt-line)]"
              >
                <Skeleton className="aspect-[16/9] rounded-none" />
                <div className="p-[16px]">
                  <Skeleton className="h-[18px] w-[140px]" />
                  <Skeleton className="mt-[8px] h-[13px] w-full" />
                  <Skeleton className="mt-[6px] h-[13px] w-[75%]" />
                  <Skeleton className="mt-[14px] h-[12px] w-[180px]" />
                </div>
              </div>
            ))}
          </div>

          {/* concepts / tools columns */}
          <div className="mt-[52px] grid grid-cols-1 gap-x-[48px] gap-y-[40px] md:grid-cols-2">
            {[0, 1].map((col) => (
              <div key={col}>
                <Skeleton className="h-[22px] w-[130px]" />
                <div className="mt-[14px] divide-y divide-[var(--jt-line-soft)] border-t border-[var(--jt-line)]">
                  {[0, 1, 2].map((row) => (
                    <div
                      key={row}
                      className="flex items-baseline gap-[12px] py-[14px]"
                    >
                      <Skeleton className="h-[15px] w-[130px] shrink-0" />
                      <Skeleton className="h-[12px] min-w-0 flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
    </div>
  )
}
