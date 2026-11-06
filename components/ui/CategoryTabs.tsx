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
    { key: "all", label: "View all", count: categories.reduce((sum, c) => sum + c.count, 0) },
    ...categories.map((c) => ({ key: c.category, label: c.label, count: c.count })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Categories"
      className="no-scrollbar flex gap-1.5 overflow-x-auto"
    >
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-[0.8125rem] transition-[background-color,color] duration-300 ease-out-soft",
              selected ? "bg-ink text-bone" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "ml-1.5 text-[0.6875rem] tabular-nums",
                selected ? "text-bone/60" : "text-ink-faint",
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
