/* The reading site's ground. `page`, not `surface`: in dark mode the two
   part company, and the checker frames need something to sit on top of. */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <main className="flex-1 bg-[var(--jt-page)]">{children}</main>
}
