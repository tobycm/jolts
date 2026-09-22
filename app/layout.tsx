import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

import { EntryReveal } from "@/components/entry-reveal";
import { OverscrollColor } from "@/components/overscroll-color";
import { ThemeSync } from "@/components/theme-mode";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { themeBootScript } from "@/lib/theme-mode";

const openRunde = localFont({
  src: [
    { path: "./fonts/OpenRunde-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/OpenRunde-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/OpenRunde-Semibold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

const augiePixel = localFont({
  src: "./fonts/augiepixel.ttf",
  variable: "--font-augie",
  display: "block",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jolts - Learn to Build Real Hardware - Hack Club",
    // every child page sets a bare title and gets the brand suffix
    template: "%s - Hack Club",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      { url: "/joltsbanner.png", width: 3100, height: 904, alt: SITE_NAME },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${openRunde.variable} ${augiePixel.variable} h-full scroll-smooth antialiased`}
      /* `scroll-smooth` is for the in-page anchors. Without this
         attribute the router inherits it too, and every navigation from
         a scrolled position becomes a second-long smooth ride to the top
         that the page transition plays straight through. Next reads the
         attribute to know it should force `auto` for its own scrolling. */
      data-scroll-behavior="smooth"
      /* fresh loads start at the top, so the root carries the header colour
         from the first paint; OverscrollColor keeps it in step after that */
      data-at-top=""
      // the inline scripts below write to <html> before hydration
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* runs synchronously before EntryReveal paints: arriving from
            another jolts page skips the entry animation, but an explicit
            refresh still plays it (see globals.css) */}
        {/* the stored theme, applied before the first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var n=performance.getEntriesByType("navigation")[0];if(n&&n.type!=="reload"&&document.referrer&&new URL(document.referrer).origin===location.origin)document.documentElement.setAttribute("data-entry-skip","")}catch(e){}`,
          }}
        />
        <ThemeSync />
        <OverscrollColor />
        <EntryReveal />
        {/* one header/footer instance for every route, so the header's
            post-click hover-hold state survives navigating from anywhere
            (including the home page) */}
        <SiteHeader />
        {children}
        <SiteFooter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
