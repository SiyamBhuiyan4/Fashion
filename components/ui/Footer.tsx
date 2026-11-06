import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-bone-dark/50">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="display text-lg tracking-[0.3em] text-ink">{site.name}</p>
          <p className="mt-1 max-w-sm text-ink-faint">
            A demo store. Nothing here can be bought, and no payment is ever taken.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/#men" className="hover:text-ink">
            Men
          </Link>
          <Link href="/#women" className="hover:text-ink">
            Women
          </Link>
          <Link href="/cart" className="hover:text-ink">
            Cart
          </Link>
        </nav>
      </div>
    </footer>
  );
}
