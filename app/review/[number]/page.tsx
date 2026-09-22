import type { Metadata } from "next"

import { CuratorGate } from "@/components/review/gate"
import { PrView } from "@/components/review/pr-view"

export const metadata: Metadata = {
  title: "Review",
  robots: { index: false, follow: false },
}

/* One pull request. The number is the only thing this page needs from the URL;
   everything else arrives client-side under the curator's own token. */

export default async function ReviewPrPage(props: PageProps<"/review/[number]">) {
  const { number } = await props.params
  const n = Number(number)

  if (!Number.isInteger(n) || n <= 0) {
    return (
      <div className="mx-auto w-full max-w-[860px] px-[28px] py-[48px]">
        <p className="text-[15px] text-[#5c6470]">
          That isn&rsquo;t a pull request number.
        </p>
      </div>
    )
  }

  return (
    <CuratorGate>
      <PrView number={n} />
    </CuratorGate>
  )
}
