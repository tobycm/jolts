import { BookLayout } from "@/components/book-layout"

export default async function GuideLayout({
  children,
  params,
}: LayoutProps<"/guides/[slug]">) {
  const { slug } = await params
  return (
    <BookLayout contentType="guides" slug={slug}>
      {children}
    </BookLayout>
  )
}
