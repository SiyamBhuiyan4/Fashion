import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import type { Settings } from "@/lib/settings";
import { waNumber } from "@/lib/whatsapp";

export function Footer({ settings }: { settings: Settings }) {
  return (
    <footer className="overflow-hidden bg-ink text-bone">
      <div className="mx-auto max-w-[90rem] px-4 pt-16 sm:px-8 sm:pt-24">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Image
              src="/brand/logo-light.png"
              alt={`${site.name} ${site.subtitle}`}
              width={390}
              height={382}
              className="h-auto w-44"
            />
            <p className="mt-6 max-w-sm text-sm text-bone/60">
              Sarees, three-pieces, kurtis and modest wear, chosen with care and delivered all over
              Bangladesh.
            </p>
          </div>
          <nav aria-label="Shop" className="flex flex-col gap-3 text-sm">
            <p className="eyebrow text-accent-soft">Shop</p>
            <Link href="/#shop" className="link-line w-fit text-bone/80 hover:text-bone">
              The collection
            </Link>
            <Link href="/cart" className="link-line w-fit text-bone/80 hover:text-bone">
              Bag
            </Link>
            <span className="text-bone/50">Order on WhatsApp</span>
          </nav>
          <div className="flex flex-col gap-3 text-sm">
            <p className="eyebrow text-accent-soft">Contact</p>
            {settings.whatsapp ? (
              <a
                href={`https://wa.me/${waNumber(settings.whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link-line w-fit text-bone/80 hover:text-bone"
              >
                WhatsApp {settings.whatsapp}
              </a>
            ) : null}
            {settings.phone && settings.phone !== settings.whatsapp ? (
              <a
                href={`tel:${settings.phone}`}
                className="link-line w-fit text-bone/80 hover:text-bone"
              >
                {settings.phone}
              </a>
            ) : null}
            {settings.facebook ? (
              <a
                href={settings.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="link-line w-fit text-bone/80 hover:text-bone"
              >
                Facebook page
              </a>
            ) : null}
            {settings.address ? <span className="text-bone/50">{settings.address}</span> : null}
            <span className="text-bone/50">Prices in Taka (৳)</span>
          </div>
        </div>
        <p className="mt-14 border-t border-bone/10 py-6 text-xs text-bone/40">
          © {new Date().getFullYear()} {site.name} {site.subtitle}
        </p>
      </div>
      {/* The wordmark, set huge and cropped by the bottom edge. */}
      <p
        aria-hidden
        className="wordmark select-none text-center text-[17vw] leading-[0.75] text-bone/[0.06]"
      >
        {site.name}
      </p>
    </footer>
  );
}
