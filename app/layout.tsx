import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const brand = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://fashion-mauve-one.vercel.app"),
  title: {
    default: `${site.name} ${site.subtitle} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: `${site.name} ${site.subtitle}`,
    description: site.description,
    images: [{ url: "/brand/aurevya-cover.jpg", width: 1080, height: 1080 }],
  },
  // Installed to an iPhone home screen, it opens full-screen with the page behind the status bar.
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f1e7",
  width: "device-width",
  initialScale: 1,
  // Lay out under the notch and home bar; components pad with env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${brand.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
