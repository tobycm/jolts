import {
  GuideContent,
  guideMetadata,
  guidePageStaticParams,
} from "@/components/guide-page"

export const dynamicParams = false

export function generateStaticParams() {
  return guidePageStaticParams("pages").map(({ page }) => ({ page }))
}

export async function generateMetadata(props: PageProps<"/start/[page]">) {
  const { page } = await props.params
  return guideMetadata("pages", "start", page)
}

export default async function Page(props: PageProps<"/start/[page]">) {
  const { page } = await props.params
  return <GuideContent contentType="pages" slug="start" pageSlug={page} />
}
