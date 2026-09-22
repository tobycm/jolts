import type { Metadata } from "next"

import { CONTENT_TYPES, type ContentType } from "@/lib/content-schema"
import { gh } from "@/lib/github/api"
import { UPSTREAM_OWNER, UPSTREAM_REPO } from "@/lib/github/config"
import { entryOf, requireCurator } from "@/lib/github/review"
import { readToken } from "@/lib/github/session"
import { renderPreview } from "@/lib/review/preview"

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"
export const maxDuration = 30

/* One file from a pull request, rendered with the site's real components. The
   review page shows this in an iframe: it keeps the guide's own typography and
   frames from fighting the review chrome, and it means the preview is also a
   plain URL a curator can open on its own. */

export default async function PreviewPage(
  props: PageProps<"/review/[number]/preview">
) {
  const { number } = await props.params
  const { path } = await props.searchParams
  const n = Number(number)
  const filePath = typeof path === "string" ? path : ""
  const entry = entryOf(filePath)

  if (
    !Number.isInteger(n) ||
    n <= 0 ||
    !entry ||
    !filePath.endsWith(".mdx") ||
    filePath.includes("..") ||
    !CONTENT_TYPES.includes(entry.contentType as ContentType)
  ) {
    return <Problem>That isn&rsquo;t a previewable file.</Problem>
  }

  const token = await readToken()
  if (!token) return <Problem>Sign in on the review page first.</Problem>

  try {
    await requireCurator(token)
  } catch (err) {
    return <Problem>{(err as Error).message}</Problem>
  }

  const pr = await gh<{ head: { sha: string } }>(
    token,
    `/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/pulls/${n}`
  )
  const res = await fetch(
    `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/contents/${encodeURI(
      filePath
    )}?ref=${pr.head.sha}`,
    {
      headers: {
        accept: "application/vnd.github.raw",
        authorization: `Bearer ${token}`,
        "user-agent": "jolts-editor",
        "x-github-api-version": "2022-11-28",
      },
      cache: "no-store",
    }
  )
  if (!res.ok) return <Problem>That file isn&rsquo;t in this pull request.</Problem>

  const result = renderPreview({
    mdx: await res.text(),
    contentType: entry.contentType,
    slug: entry.slug,
    prNumber: n,
    sourceFile: filePath.split("/").pop() ?? "index.mdx",
  })
  if (!result.ok) return <Problem>{result.error}</Problem>

  return (
    <>
      {/* This page inherits the root layout, which means the site header and
          footer render around it - fine on a real page, noise inside a review
          iframe. Hidden here only; the real site is untouched. */}
      <style>{
        "body > header, body > footer { display: none !important }" +
        "body { min-height: 0 !important }"
      }</style>
      {/* 720px is the measure a real guide body is set to (see guide-page) */}
      <main className="mx-auto w-full max-w-[720px] px-[24px] pt-[20px] pb-[40px]">
        <p className="font-mono text-[11px] text-black/35">
          {filePath.replace(/^content\//, "")}
        </p>
        <h1 className="mt-[4px] mb-[6px] text-[32px] leading-[1.08] font-semibold tracking-[-0.03em] text-black">
          {result.meta.title}
        </h1>
        {result.meta.subtitle && (
          <p className="mb-[10px] text-[16.5px] leading-[1.5] tracking-[-0.01em] text-black/55">
            {result.meta.subtitle}
          </p>
        )}
        {result.body}
      </main>
    </>
  )
}

function Problem({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[560px] px-[24px] py-[36px]">
      <p className="text-[14px] leading-[1.6] text-black/55">{children}</p>
    </main>
  )
}
