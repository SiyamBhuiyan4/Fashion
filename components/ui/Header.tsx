"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/useHydrated";
import { useCartStore } from "@/store/cartStore";
import { useOutfitStore } from "@/store/outfitStore";

// Both collections live on one page; these only jump, nothing needs clicking.
const links = [
  { href: "/#men", label: "Men" },
  { href: "/#women", label: "Women" },
];

export function Header() {
  const pathname = usePathname();
  // Highlights whichever collection the scroll is currently on.
  const activeGender = useOutfitStore((state) => state.activeGender);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const items = useCartStore((state) => state.items);
  // The cart is restored from localStorage after hydration, so the count is only shown once
  // the client has caught up — otherwise the server and client markup disagree.
  const hydrated = useHydrated();
  const count = hydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bone/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="display text-xl tracking-[0.3em] text-ink">
          {site.name}
        </Link>

        <nav aria-label="Collections" className="flex items-center gap-1 text-sm">
          {links.map((link) => {
            const active = pathname === "/" && activeGender === link.href.replace("/#", "");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 transition-colors",
                  active ? "bg-ink text-bone" : "text-ink-soft hover:bg-bone-dark hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={openDrawer}
          className="relative flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" />
            <path d="M9 7a3 3 0 1 1 6 0" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Cart</span>
          <span
            aria-label={`${count} item${count === 1 ? "" : "s"} in cart`}
            className={cn(
              "grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs font-medium",
              count > 0 ? "bg-accent text-white" : "bg-bone-dark text-ink-faint",
            )}
          >
            {count}
          </span>
        </button>
      </div>
    </header>
  );
}
