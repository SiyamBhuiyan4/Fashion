"use client";

import Link from "next/link";
import { useState } from "react";
import { newCategoryId, type CategoryRow } from "@/lib/categories";
import { newSectionId, type SectionRow } from "@/lib/sections";
import { cn } from "@/lib/utils";
import {
  adminPost,
  button,
  ErrorNote,
  input,
  Loading,
  PageTitle,
  useAdminData,
  useToast,
} from "@/components/admin/ui";

interface Data {
  sections: SectionRow[];
  categories: CategoryRow[];
  counts: Record<string, number>;
  sectionCounts: Record<string, number>;
}

interface Draft {
  sections: SectionRow[];
  categories: CategoryRow[];
}

/** Swaps an item with its neighbour inside `list`, keeping everything else in place. */
function moved<T>(list: T[], item: T, within: T[], step: -1 | 1): T[] {
  const at = within.indexOf(item);
  const other = within[at + step];
  if (other === undefined) return list;
  const next = [...list];
  const i = next.indexOf(item);
  const j = next.indexOf(other);
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

function Arrows({
  label,
  first,
  last,
  onMove,
}: {
  label: string;
  first: boolean;
  last: boolean;
  onMove: (step: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-label={`Move ${label} up`}
        disabled={first}
        onClick={() => onMove(-1)}
        className="grid h-6 w-8 place-items-center text-xs text-ink-soft disabled:opacity-25"
      >
        ▲
      </button>
      <button
        type="button"
        aria-label={`Move ${label} down`}
        disabled={last}
        onClick={() => onMove(1)}
        className="grid h-6 w-8 place-items-center text-xs text-ink-soft disabled:opacity-25"
      >
        ▼
      </button>
    </div>
  );
}

export function CategoriesEditor() {
  const { data, error } = useAdminData<Data>("/api/admin/categories");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newCategory, setNewCategory] = useState<Record<string, string>>({});
  const [newSection, setNewSection] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast, show } = useToast();

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;
  const current: Draft = draft ?? { sections: data.sections, categories: data.categories };
  const { sections, categories } = current;
  const countOf = (c: CategoryRow) => data.counts[`${c.gender}|${c.id}`] ?? 0;
  const sectionCount = (s: SectionRow) => data.sectionCounts[s.id] ?? 0;

  const update = (next: Partial<Draft>) => {
    setDraft({ ...current, ...next });
    setSaveError(null);
  };

  const addSection = () => {
    const name = newSection.trim();
    if (!name) return;
    if (sections.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setSaveError(`"${name}" already exists.`);
      return;
    }
    update({ sections: [...sections, { id: newSectionId(name, sections), name }] });
    setNewSection("");
  };

  const removeSection = (s: SectionRow) => {
    const used = sectionCount(s);
    if (used > 0) {
      setSaveError(
        `"${s.name}" has ${used} product${used === 1 ? "" : "s"}. Move them to another section in Products first.`,
      );
      return;
    }
    if (sections.length === 1) {
      setSaveError("Keep at least one section.");
      return;
    }
    update({
      sections: sections.filter((x) => x !== s),
      categories: categories.filter((c) => c.gender !== s.id),
    });
  };

  const addCategory = (section: SectionRow) => {
    const name = (newCategory[section.id] ?? "").trim();
    if (!name) return;
    if (
      categories.some((c) => c.gender === section.id && c.name.toLowerCase() === name.toLowerCase())
    ) {
      setSaveError(`"${name}" already exists in ${section.name}.`);
      return;
    }
    update({
      categories: [
        ...categories,
        { id: newCategoryId(name, section.id, categories), name, gender: section.id },
      ],
    });
    setNewCategory((n) => ({ ...n, [section.id]: "" }));
  };

  const removeCategory = (c: CategoryRow) => {
    const used = countOf(c);
    if (used > 0) {
      setSaveError(
        `"${c.name}" has ${used} product${used === 1 ? "" : "s"}. Open them in Products and choose another category first.`,
      );
      return;
    }
    update({ categories: categories.filter((x) => x !== c) });
  };

  const save = async () => {
    if (sections.some((s) => !s.name.trim()) || categories.some((c) => !c.name.trim())) {
      setSaveError("Every section and category needs a name.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await adminPost<Draft>("/api/admin/categories", current);
      setDraft(res);
      show("Saved — the shop is updated");
    } catch (e) {
      setSaveError((e as Error).message);
    }
    setSaving(false);
  };

  return (
    <div>
      <PageTitle
        title="Sections & categories"
        subtitle="Sections are the big groups in the shop (e.g. Women, Men, Kids). Each has its own categories."
      />

      <div className="space-y-6">
        {sections.map((section, si) => {
          const own = categories.filter((c) => c.gender === section.id);
          const used = sectionCount(section);
          return (
            <section
              key={section.id}
              className="rounded-2xl border border-line bg-white p-4 sm:p-6"
            >
              <div className="flex items-center gap-2">
                <Arrows
                  label={section.name}
                  first={si === 0}
                  last={si === sections.length - 1}
                  onMove={(step) => update({ sections: moved(sections, section, sections, step) })}
                />
                <label className="min-w-0 flex-1">
                  <span className="text-xs text-ink-faint">Section name</span>
                  <input
                    value={section.name}
                    onChange={(e) =>
                      update({
                        sections: sections.map((x) =>
                          x === section ? { ...x, name: e.target.value } : x,
                        ),
                      })
                    }
                    maxLength={30}
                    className={cn(input, "mt-0.5 h-12 text-lg font-semibold")}
                  />
                </label>
                <span className="mt-4 w-20 shrink-0 text-center text-xs text-ink-faint">
                  {used} product{used === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => removeSection(section)}
                  className={cn(
                    "mt-4 h-11 shrink-0 rounded-xl border px-3 text-xs",
                    used > 0
                      ? "border-line text-ink-faint"
                      : "border-red-200 text-red-700 hover:bg-red-50",
                  )}
                >
                  Delete section
                </button>
              </div>

              <div className="mt-4 border-t border-line pt-4 sm:pl-10">
                <p className="mb-2 text-sm font-medium">
                  Categories in {section.name || "this section"}
                </p>
                {own.length === 0 ? (
                  <p className="py-2 text-sm text-ink-faint">No categories yet — add one below.</p>
                ) : (
                  <ul className="grid gap-2 lg:grid-cols-2">
                    {own.map((c, i) => {
                      const n = countOf(c);
                      return (
                        <li
                          key={`${c.gender}-${c.id}`}
                          className="flex items-center gap-2 rounded-xl border border-line p-2"
                        >
                          <Arrows
                            label={c.name}
                            first={i === 0}
                            last={i === own.length - 1}
                            onMove={(step) =>
                              update({ categories: moved(categories, c, own, step) })
                            }
                          />
                          <input
                            value={c.name}
                            onChange={(e) =>
                              update({
                                categories: categories.map((x) =>
                                  x === c ? { ...x, name: e.target.value } : x,
                                ),
                              })
                            }
                            maxLength={40}
                            aria-label="Category name"
                            className={cn(input, "mt-0 h-11")}
                          />
                          <span className="w-14 shrink-0 text-center text-xs text-ink-faint">
                            {n} item{n === 1 ? "" : "s"}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeCategory(c)}
                            aria-label={`Delete ${c.name}`}
                            className={cn(
                              "grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-lg",
                              n > 0
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
                <div className="mt-3 flex gap-2">
                  <input
                    value={newCategory[section.id] ?? ""}
                    onChange={(e) =>
                      setNewCategory((n) => ({ ...n, [section.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCategory(section);
                      }
                    }}
                    maxLength={40}
                    placeholder="New category, e.g. Lehenga"
                    className={cn(input, "mt-0")}
                  />
                  <button
                    type="button"
                    onClick={() => addCategory(section)}
                    className={button.secondary}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </section>
          );
        })}

        <div className="rounded-2xl border border-dashed border-ink-faint bg-white/60 p-4 sm:p-6">
          <p className="text-sm font-medium">Add a section</p>
          <div className="mt-2 flex gap-2">
            <input
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSection();
                }
              }}
              maxLength={30}
              placeholder="e.g. Kids, Girls, Accessories"
              className={cn(input, "mt-0")}
            />
            <button type="button" onClick={addSection} className={button.secondary}>
              + Add section
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        The shop only shows sections and categories that have products. To empty one, open its
        products in{" "}
        <Link href="/admin/products" className="underline">
          Products
        </Link>{" "}
        and pick another.
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
            {saving ? "Saving…" : draft === null ? "No changes" : "Save"}
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
