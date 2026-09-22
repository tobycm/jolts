import {
  GuideContent,
  guideMetadata,
  guidePageStaticParams,
} from "@/components/guide-page"

export const dynamicParams = false

export function generateStaticParams() {
  return guidePageStaticParams("guides")
}

export async function generateMetadata(
  props: PageProps<"/guides/[slug]/[page]">
) {
  const { slug, page } = await props.params
  return guideMetadata("guides", slug, page)
}

export default async function Page(props: PageProps<"/guides/[slug]/[page]">) {
  const { slug, page } = await props.params
  return <GuideContent slug={slug} pageSlug={page} />
}
