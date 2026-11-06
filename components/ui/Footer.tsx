import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="overflow-hidden bg-ink text-bone">
      <div className="mx-auto max-w-[90rem] px-4 pt-16 sm:px-8 sm:pt-24">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="display max-w-sm text-4xl leading-[1.05]">
              Clothes that look <em className="italic">better</em> the more you wear them.
            </p>
            <p className="mt-5 max-w-sm text-sm text-bone/55">
              A demo store. Nothing here can be bought, and no payment is ever taken.
            </p>
          </div>
          <nav aria-label="Shop" className="flex flex-col gap-3 text-sm">
            <p className="eyebrow text-bone/40">Shop</p>
            <Link href="/#women" className="link-line w-fit text-bone/80 hover:text-bone">
              Women
            </Link>
            <Link href="/#men" className="link-line w-fit text-bone/80 hover:text-bone">
              Men
            </Link>
            <Link href="/#in-motion" className="link-line w-fit text-bone/80 hover:text-bone">
              In motion
            </Link>
          </nav>
          <nav aria-label="Help" className="flex flex-col gap-3 text-sm">
            <p className="eyebrow text-bone/40">Your order</p>
            <Link href="/cart" className="link-line w-fit text-bone/80 hover:text-bone">
              Bag
            </Link>
            <span className="text-bone/50">Dhaka, Bangladesh</span>
            <span className="text-bone/50">Prices in Taka (৳)</span>
          </nav>
        </div>
      </div>
      {/* The wordmark, set huge and cropped by the bottom edge. */}
      <p
        aria-hidden
        className="display mt-16 select-none text-center text-[22vw] leading-[0.75] tracking-[0.06em] text-bone/[0.07]"
      >
        {site.name}
      </p>
    </footer>
  );
}
