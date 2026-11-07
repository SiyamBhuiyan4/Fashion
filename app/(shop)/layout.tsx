import { getCatalog, getSettings } from "@/lib/products.server";
import { CatalogProvider } from "@/components/ui/CatalogProvider";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { CartDrawer } from "@/components/ui/CartDrawer";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // Fetched from the Telegram-backed database and handed to the client, so the cart and the
  // shop can resolve products (and the owner's settings) without another round trip.
  const [catalog, settings] = await Promise.all([getCatalog(), getSettings()]);

  return (
    <CatalogProvider catalog={catalog} settings={settings}>
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
      <Footer settings={settings} />
      <CartDrawer />
    </CatalogProvider>
  );
}
