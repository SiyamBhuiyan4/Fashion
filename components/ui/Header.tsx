"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/useHydrated";
import { useCartStore } from "@/store/cartStore";
import { useSectionStore } from "@/store/sectionStore";

const links = [
  { href: "/#women", label: "Women", section: "women" },
  { href: "/#men", label: "Men", section: "men" },
] as const;

/**
 * Fixed header. On the home page it sits transparent over the hero, in white, and settles into a
 * frosted paper bar once the page scrolls; everywhere else it is the bar from the start.
 */
export function Header() {
  const pathname = usePathname();
  const home = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const activeGender = useSectionStore((state) => state.active);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const items = useCartStore((state) => state.items);
  // The cart is restored from localStorage after hydration, so the count waits for it.
  const hydrated = useHydrated();
  const count = hydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  // A little bump on the count whenever something is added.
  const [bump, setBump] = useState(false);
  const previous = useRef(count);
  useEffect(() => {
    if (count > previous.current) {
      setBump(true);
      const timer = window.setTimeout(() => setBump(false), 450);
      previous.current = count;
      return () => window.clearTimeout(timer);
    }
    previous.current = count;
  }, [count]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const clear = home && !scrolled;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[background-color,color,box-shadow,backdrop-filter] duration-500 ease-out-soft",
          clear
            ? "bg-transparent text-ink"
            : "bg-bone/80 text-ink shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl",
        )}
      >
        <div className="mx-auto grid h-16 max-w-[90rem] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-8">
          <nav aria-label="Collections" className="flex items-center gap-5 text-[0.8125rem]">
            {links.map((link) => {
              const active = home && !clear && link.section === activeGender;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "true" : undefined}
                  className={cn("link-line py-1 tracking-wide", active && "bg-[length:100%_1px]")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/"
            aria-label={`${site.name} — home`}
            className="display text-2xl tracking-[0.32em] sm:text-[1.75rem]"
          >
            {site.name}
          </Link>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={openDrawer}
              className="group relative flex items-center gap-2 py-2 text-[0.8125rem] tracking-wide"
            >
              <span className="link-line hidden sm:inline">Bag</span>
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5 sm:hidden"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M5.5 8h13l-1.2 12h-10.6L5.5 8Z" strokeLinejoin="round" />
                <path d="M9 8a3 3 0 1 1 6 0" strokeLinecap="round" />
              </svg>
              <span
                aria-label={`${count} item${count === 1 ? "" : "s"} in bag`}
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-medium tabular-nums transition-colors",
                  count > 0 ? "bg-accent text-white" : "bg-ink/8 text-ink-soft",
                  bump && "animate-bump",
                )}
              >
                {count}
              </span>
            </button>
          </div>
        </div>
      </header>
      {/* Pages other than home start below the bar; the home hero runs under it. */}
      {home ? null : <div aria-hidden className="h-16" />}
    </>
  );
}
