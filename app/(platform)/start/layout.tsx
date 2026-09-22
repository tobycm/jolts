import { BookLayout } from "@/components/book-layout"

/* "Start here" is a page entry (content/pages/start), so it wears the
   guide chrome without living under /guides. No hub crumb: it is a
   top-level destination, linked from the header. */
export default function StartLayout({ children }: LayoutProps<"/start">) {
  return (
    <BookLayout contentType="pages" slug="start" hub={null}>
      {children}
    </BookLayout>
  )
}
