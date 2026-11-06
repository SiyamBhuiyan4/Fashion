"use client";

import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryTabs({
  categories,
  active,
  onSelect,
}: {
  categories: Array<{ category: Category; label: string; count: number }>;
  active: Category | "all";
  onSelect: (category: Category | "all") => void;
}) {
  const tabs: Array<{ key: Category | "all"; label: string; count: number }> = [
    { key: "all", label: "All", count: categories.reduce((sum, c) => sum + c.count, 0) },
    ...categories.map((c) => ({ key: c.category, label: c.label, count: c.count })),
  ];

  return (
    <div role="tablist" aria-label="Categories" className="no-scrollbar flex gap-2 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          type="button"
          aria-selected={active === tab.key}
          onClick={() => onSelect(tab.key)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
            active === tab.key
              ? "border-ink bg-ink text-bone"
              : "border-line bg-white text-ink-soft hover:border-ink hover:text-ink",
          )}
        >
          {tab.label}
          <span className="ml-1.5 text-xs opacity-60">{tab.count}</span>
        </button>
      ))}
    </div>
  );
}
