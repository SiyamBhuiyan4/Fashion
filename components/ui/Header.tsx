"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/useHydrated";
import { useCartStore } from "@/store/cartStore";
import { useCatalogStore } from "@/store/catalogStore";
import { sectionsIn } from "@/lib/catalog";
import { SearchOverlay } from "@/components/ui/SearchOverlay";

/** One link per section with products (Women, Men, Kids…), or one "Shop" link. */
function useSectionLinks(): Array<{ href: string; label: string }> {
  const catalog = useCatalogStore((s) => s.catalog);
  const sections = sectionsIn(
    catalog,
    useCatalogStore((s) => s.sections),
  );
  if (sections.length > 1) return sections.map((s) => ({ href: `/#${s.id}`, label: s.name }));
  return [{ href: "/#shop", label: "Shop" }];
}

/**
 * Fixed header. On the home page it sits transparent over the hero, in white, and settles into a
 * frosted paper bar once the page scrolls; everywhere else it is the bar from the start.
 */
export function Header() {
  const pathname = usePathname();
  const home = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const links = useSectionLinks();
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  // Any navigation closes the menu.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,color,box-shadow,backdrop-filter] duration-500 ease-out-soft",
          clear
            ? "bg-transparent text-ink"
            : "bg-bone/80 text-ink shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl",
        )}
      >
        <div className="mx-auto grid h-16 max-w-[90rem] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-8">
          {/* Phones: menu and search sit on the left, so the logo keeps clear space. */}
          <div className="-ml-2 flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="grid h-11 w-11 place-items-center"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M4 8h16M4 16h16" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="grid h-11 w-10 place-items-center"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav
            aria-label="Collections"
            className="hidden items-center gap-5 text-[0.8125rem] sm:flex"
          >
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="link-line py-1 tracking-wide">
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/"
            aria-label={`${site.name} ${site.subtitle} — home`}
            className="flex flex-col items-center"
          >
            <Image
              src="/brand/mark-dark.png"
              alt=""
              width={80}
              height={48}
              priority
              className="h-6 w-auto sm:h-7"
            />
            <span className="wordmark mt-0.5 whitespace-nowrap pl-[0.18em] text-[1.0625rem] sm:text-[1.25rem]">
              {site.name}
            </span>
          </Link>

          <div className="flex items-center justify-end gap-1 sm:gap-6">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="hidden h-11 items-center gap-2 text-[0.8125rem] tracking-wide sm:flex"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5 sm:h-4 sm:w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" strokeLinecap="round" />
              </svg>
              <span className="link-line hidden lg:inline">Search</span>
            </button>
            <button
              type="button"
              onClick={openDrawer}
              className="group relative -mr-2 flex h-11 items-center gap-1.5 px-2 text-[0.8125rem] tracking-wide sm:mr-0 sm:gap-2 sm:px-0"
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
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
      {/* Pages other than home start below the bar; the home hero runs under it. */}
      {home ? null : <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-top))]" />}
    </>
  );
}

/** Full-screen phone menu: big serif links that slide in, closed by any choice or Escape. */
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const openDrawer = useCartStore((state) => state.openDrawer);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const sections = useSectionLinks();
  const items = [
    ...sections.map((l) => ({ href: l.href, label: l.label, note: "The collection" })),
    { href: "/#in-motion", label: "On video", note: "See how it drapes" },
    { href: "/cart", label: "Bag", note: "Order on WhatsApp" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-bone/97 backdrop-blur-xl transition-[opacity,visibility] duration-500 ease-out-soft sm:hidden",
        open ? "visible opacity-100" : "invisible opacity-0",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <span className="wordmark text-[1.0625rem]">{site.name}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="-mr-2 grid h-11 w-11 place-items-center"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <nav aria-label="Menu" className="flex flex-1 flex-col justify-center gap-2 px-6">
        {items.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            className={cn(
              "group border-b border-line py-5 transition-[opacity,transform] duration-700 ease-out-soft",
              open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
            )}
            style={{ transitionDelay: open ? `${120 + i * 80}ms` : "0ms" }}
          >
            <span className="display block text-5xl">{item.label}</span>
            <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-ink-faint">
              {item.note}
            </span>
          </Link>
        ))}
      </nav>
      <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            onClose();
            openDrawer();
          }}
          className="flex h-14 w-full items-center justify-between bg-ink px-5 text-sm font-medium text-bone"
        >
          <span>Open bag</span>
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
