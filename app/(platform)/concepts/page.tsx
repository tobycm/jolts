import type { Metadata } from "next"

import { Breadcrumb } from "@/components/breadcrumb"
import { EntryList } from "@/components/entry-card"
import { NewEntryRow } from "@/components/new-entry-link"
import { HubHero } from "@/components/hub-hero"
import { CollectionJsonLd } from "@/components/json-ld"
import { listConcepts } from "@/lib/content"

export const metadata: Metadata = {
  title: "Electronics Concepts",
  description:
    "Understand the ideas behind the builds: voltage, I2C, pull-ups, and everything guides link to at the moment of need.",
  alternates: { canonical: "/concepts" },
}

export default function ConceptsPage() {
  const concepts = listConcepts()
  return (
    <div className="mx-auto w-full max-w-[760px] px-[28px] pt-[40px]">
      <CollectionJsonLd
        contentType="concepts"
        title="Concepts"
        description={metadata.description as string}
        entries={concepts}
      />
      <Breadcrumb
        trail={[{ label: "Concepts", href: "/concepts" }]}
        accent="var(--jt-concepts-accent)"
      />
      <HubHero
        type="concepts"
        title="Concepts"
        blurb="Understand this idea. Builds never explain a concept inline - they link here at the exact moment you need it, so each idea gets written well once."
      />
      <div className="mt-[26px] border-t border-[var(--jt-line)]">
        <EntryList entries={concepts} />
      </div>
      <div className="mt-[20px]">
        <NewEntryRow type="concepts" />
      </div>
    </div>
  )
}
