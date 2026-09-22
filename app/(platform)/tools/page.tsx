import type { Metadata } from "next"

import { Breadcrumb } from "@/components/breadcrumb"
import { EntryList } from "@/components/entry-card"
import { NewEntryRow } from "@/components/new-entry-link"
import { HubHero } from "@/components/hub-hero"
import { CollectionJsonLd } from "@/components/json-ld"
import { listTools } from "@/lib/content"

export const metadata: Metadata = {
  title: "Hardware Tools",
  description:
    "How to use this specific thing - soldering irons, multimeters, KiCad. Each tool gets a first-hour page and deeper dives.",
  alternates: { canonical: "/tools" },
}

export default function ToolsPage() {
  const tools = listTools()
  return (
    <div className="mx-auto w-full max-w-[760px] px-[28px] pt-[40px]">
      <CollectionJsonLd
        contentType="tools"
        title="Tools"
        description={metadata.description as string}
        entries={tools}
      />
      <Breadcrumb
        trail={[{ label: "Tools", href: "/tools" }]}
        accent="var(--jt-tools-accent)"
      />
      <HubHero
        type="tools"
        title="Tools"
        blurb="How to use this specific thing. Every tool starts with a first-hour page - enough to be dangerous - and software tools count as hardware here."
      />
      <div className="mt-[26px] border-t border-[var(--jt-line)]">
        <EntryList entries={tools} />
      </div>
      <div className="mt-[20px]">
        <NewEntryRow type="tools" />
      </div>
    </div>
  )
}
