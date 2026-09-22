import type { Metadata } from "next"

import { CuratorBadge } from "@/components/review/curator-badge"
import { CuratorGate } from "@/components/review/gate"
import { ReviewQueue } from "@/components/review/queue"

export const metadata: Metadata = {
  title: "Review queue",
  robots: { index: false, follow: false },
}

/* The queue. A static shell - everything inside is fetched with the curator's
   own GitHub token, so nothing privileged is ever baked into the page. */

export default function ReviewPage() {
  return (
    <CuratorGate>
      <div className="mx-auto w-full max-w-[860px] px-[28px] py-[26px]">
        <div className="flex items-end justify-between gap-[16px]">
          <div>
            <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] text-black">
              Review queue
            </h1>
            <p className="mt-[7px] max-w-[520px] text-[14.5px] leading-[1.55] text-black/55">
              Everything waiting on a curator. Frontmatter is checked against the
              same schema CI runs, photos are shown as photos, and verdicts post
              straight to GitHub under your name.
            </p>
          </div>
          <CuratorBadge />
        </div>
        <div className="mt-[20px]">
          <ReviewQueue />
        </div>
      </div>
    </CuratorGate>
  )
}
