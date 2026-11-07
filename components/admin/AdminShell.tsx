"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { adminPost } from "@/components/admin/ui";

const NAV = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: "M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3c0 1.7-1.8 3-4 3S8 5.7 8 4Z",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const signOut = async () => {
    await adminPost("/api/admin/logout", {}).catch(() => undefined);
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-dvh bg-bone lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Computers: a sidebar. */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-ink px-4 py-6 text-bone lg:flex">
        <Link href="/admin" className="flex flex-col items-center gap-1 pb-8">
          <Image src="/brand/mark-light.png" alt="" width={80} height={48} className="h-9 w-auto" />
          <span className="wordmark text-lg">Aurevya</span>
          <span className="text-[0.625rem] uppercase tracking-[0.3em] text-accent-soft">Admin</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                active(item.href)
                  ? "bg-bone text-ink"
                  : "text-bone/70 hover:bg-white/10 hover:text-bone",
              )}
            >
              <Icon d={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-white/10 pt-4 text-sm">
          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="flex h-10 items-center rounded-xl px-3 text-bone/70 hover:bg-white/10 hover:text-bone"
          >
            View shop ↗
          </a>
          <button
            type="button"
            onClick={signOut}
            className="flex h-10 items-center rounded-xl px-3 text-left text-bone/70 hover:bg-white/10 hover:text-bone"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Phones: a top bar and a tab bar at the bottom. */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ink px-4 pt-[env(safe-area-inset-top)] text-bone lg:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src="/brand/mark-light.png"
              alt=""
              width={60}
              height={36}
              className="h-6 w-auto"
            />
            <span className="wordmark text-sm">Aurevya</span>
            <span className="text-[0.5625rem] uppercase tracking-[0.25em] text-accent-soft">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-1 text-xs">
            <a href="/" target="_blank" rel="noopener" className="px-2 py-2 text-bone/70">
              Shop ↗
            </a>
            <button type="button" onClick={signOut} className="px-2 py-2 text-bone/70">
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem]",
                active(item.href) ? "text-ink" : "text-ink-faint",
              )}
            >
              <Icon d={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
