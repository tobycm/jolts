import type { Metadata } from "next"

import "./editor.css"

/* The editor lives under the global site header; this layout only carries
   the editor stylesheet and the white ground. */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function EditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <main className="jolts-editor-page flex-1 bg-white">{children}</main>
}
