import { GuideContent, guideMetadata } from "@/components/guide-page"

export function generateMetadata() {
  return guideMetadata("pages", "start")
}

export default function Page() {
  return <GuideContent contentType="pages" slug="start" />
}
