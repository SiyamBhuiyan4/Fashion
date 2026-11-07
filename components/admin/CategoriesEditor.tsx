"use client";

import Link from "next/link";
import { useState } from "react";
import { newCategoryId, type CategoryRow } from "@/lib/categories";
import { GENDER_LABELS } from "@/lib/catalog";
import type { Gender } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  adminPost,
  button,
  Card,
  ErrorNote,
  input,
  Loading,
  PageTitle,
  useAdminData,
  useToast,
} from "@/components/admin/ui";

interface Data {
  categories: CategoryRow[];
  counts: Record<string, number>;
}

export function CategoriesEditor() {
  const { data, error } = useAdminData<Data>("/api/admin/categories");
  const [draft, setDraft] = useState<CategoryRow[] | null>(null);
  const [newName, setNewName] = useState<Record<Gender, string>>({ women: "", men: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast, show } = useToast();

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;
  const list = draft ?? data.categories;
  const count = (c: CategoryRow) => data.counts[`${c.gender}|${c.id}`] ?? 0;

  const update = (next: CategoryRow[]) => {
    setDraft(next);
    setSaveError(null);
  };

  const rename = (target: CategoryRow, name: string) =>
    update(list.map((c) => (c === target ? { ...c, name } : c)));

  const remove = (target: CategoryRow) => update(list.filter((c) => c !== target));

  /** Moves a category up or down within its own section. */
  const move = (target: CategoryRow, step: -1 | 1) => {
    const same = list.filter((c) => c.gender === target.gender);
    const at = same.indexOf(target);
    const swap = same[at + step];
    if (!swap) return;
    const next = [...list];
    const i = next.indexOf(target);
    const j = next.indexOf(swap);
    [next[i], next[j]] = [next[j]!, next[i]!];
    update(next);
  };

  const add = (gender: Gender) => {
    const name = newName[gender].trim();
    if (!name) return;
    if (list.some((c) => c.gender === gender && c.name.toLowerCase() === name.toLowerCase())) {
      setSaveError(`"${name}" already exists in ${GENDER_LABELS[gender]}.`);
      return;
    }
    update([...list, { id: newCategoryId(name, gender, list), name, gender }]);
    setNewName((n) => ({ ...n, [gender]: "" }));
  };

  const save = async () => {
    if (list.some((c) => !c.name.trim())) {
      setSaveError("Every category needs a name.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await adminPost<{ categories: CategoryRow[] }>("/api/admin/categories", {
        categories: list,
      });
      setDraft(res.categories);
      show("Categories saved — the shop is updated");
    } catch (e) {
      setSaveError((e as Error).message);
    }
    setSaving(false);
  };

  return (
    <div>
      <PageTitle
        title="Categories"
        subtitle="Add, rename, reorder or remove the categories customers see in each section."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {(["women", "men"] as const).map((gender) => {
          const own = list.filter((c) => c.gender === gender);
          return (
            <Card key={gender} title={GENDER_LABELS[gender]}>
              {own.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-faint">No categories yet.</p>
              ) : (
                <ul className="space-y-2">
                  {own.map((c, i) => {
                    const used = count(c);
                    return (
                      <li
                        key={`${c.gender}-${c.id}`}
                        className="flex items-center gap-2 rounded-xl border border-line p-2"
                      >
                        <div className="flex flex-col">
                          <button
                            type="button"
                            aria-label={`Move ${c.name} up`}
                            disabled={i === 0}
                            onClick={() => move(c, -1)}
                            className="grid h-6 w-8 place-items-center text-xs text-ink-soft disabled:opacity-25"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${c.name} down`}
                            disabled={i === own.length - 1}
                            onClick={() => move(c, 1)}
                            className="grid h-6 w-8 place-items-center text-xs text-ink-soft disabled:opacity-25"
                          >
                            ▼
                          </button>
                        </div>
                        <input
                          value={c.name}
                          onChange={(e) => rename(c, e.target.value)}
                          maxLength={40}
                          aria-label="Category name"
                          className={cn(input, "mt-0 h-11")}
                        />
                        <span
                          className="w-16 shrink-0 text-center text-xs text-ink-faint"
                          title="Products in this category"
                        >
                          {used} item{used === 1 ? "" : "s"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (used > 0) {
                              setSaveError(
                                `"${c.name}" has ${used} product${used === 1 ? "" : "s"}. Open them in Products and choose another category first.`,
                              );
                              return;
                            }
                            remove(c);
                          }}
                          aria-label={`Delete ${c.name}`}
                          className={cn(
                            "grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-lg",
                            used > 0
                              ? "border-line text-ink-faint"
                              : "border-red-200 text-red-700 hover:bg-red-50",
                          )}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-4 flex gap-2">
                <input
                  value={newName[gender]}
                  onChange={(e) => setNewName((n) => ({ ...n, [gender]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add(gender);
                    }
                  }}
                  maxLength={40}
                  placeholder={
                    gender === "women" ? "New category, e.g. Lehenga" : "New category, e.g. Fatua"
                  }
                  className={cn(input, "mt-0")}
                />
                <button type="button" onClick={() => add(gender)} className={button.secondary}>
                  + Add
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-ink-faint">
        A category only shows in the shop once it has products. To empty a category, open its
        products in{" "}
        <Link href="/admin/products" className="underline">
          Products
        </Link>{" "}
        and pick another category.
      </p>

      <div className="sticky bottom-16 z-20 -mx-4 mt-6 border-t border-line bg-bone/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0 lg:-mx-10 lg:px-10">
        <ErrorNote message={saveError} />
        <div className={cn("flex gap-2", saveError && "mt-3")}>
          <button
            type="button"
            onClick={save}
            disabled={saving || draft === null}
            className={cn(button.primary, "flex-1 sm:flex-none")}
          >
            {saving ? "Saving…" : draft === null ? "No changes" : "Save categories"}
          </button>
          {draft !== null ? (
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setSaveError(null);
              }}
              className={button.secondary}
            >
              Undo changes
            </button>
          ) : null}
        </div>
      </div>
      {toast}
    </div>
  );
}
