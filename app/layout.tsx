import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { getCatalog } from "@/lib/products.server";
import { site } from "@/lib/site";
import { CatalogProvider } from "@/components/ui/CatalogProvider";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { CartDrawer } from "@/components/ui/CartDrawer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f5f3ef",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetched once per request from the Telegram-backed database and handed to the client, so the
  // cart and the shop can resolve products without another round trip.
  const catalog = await getCatalog();

  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <CatalogProvider catalog={catalog}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-bone"
          >
            Skip to content
          </a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <CartDrawer />
        </CatalogProvider>
      </body>
    </html>
  );
}
