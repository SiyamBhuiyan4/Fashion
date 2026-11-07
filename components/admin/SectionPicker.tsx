"use client";

import { useState } from "react";
import { newCategoryId, type CategoryRow } from "@/lib/categories";
import { newSectionId, sectionName, type SectionRow } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { adminPost, button, input } from "@/components/admin/ui";

async function saveStructure(sections: SectionRow[], categories: CategoryRow[]) {
  return adminPost<{ sections: SectionRow[]; categories: CategoryRow[] }>("/api/admin/categories", {
    sections,
    categories,
  });
}

/**
 * The product form's section choice, with the sections editable in place: rename, delete
 * (refused while a section still has products) and add, saved straight away.
 */
export function SectionPicker({
  sections,
  categories,
  value,
  onPick,
  onChanged,
}: {
  sections: SectionRow[];
  categories: CategoryRow[];
  value: string;
  onPick: (id: string) => void;
  /** Called after a save, so the form reloads sections and categories. */
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = sections.some((s) => s.id === value)
    ? sections
    : [...sections, { id: value, name: sectionName(sections, value) }];

  const run = async (next: SectionRow[], nextCategories: CategoryRow[], after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await saveStructure(next, nextCategories);
      after?.();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const rename = (s: SectionRow) => {
    const name = (names[s.id] ?? s.name).trim();
    if (!name || name === s.name) return;
    void run(
      sections.map((x) => (x.id === s.id ? { ...x, name } : x)),
      categories,
    );
  };

  const remove = (s: SectionRow) => {
    if (sections.length === 1) {
      setError("Keep at least one section.");
      return;
    }
    void run(
      sections.filter((x) => x.id !== s.id),
      categories.filter((c) => c.gender !== s.id),
      () => {
        if (value === s.id) {
          const other = sections.find((x) => x.id !== s.id);
          if (other) onPick(other.id);
        }
      },
    );
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    if (sections.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setError(`"${name}" already exists.`);
      return;
    }
    const id = newSectionId(name, sections);
    void run([...sections, { id, name }], categories, () => {
      setNewName("");
      onPick(id);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Section</p>
        <button
          type="button"
          onClick={() => {
            setEditing((e) => !e);
            setError(null);
            setNames({});
          }}
          className="rounded-lg px-2 py-1 text-xs font-medium text-ink-soft underline"
        >
          {editing ? "Done" : "Edit sections"}
        </button>
      </div>

      {!editing ? (
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shown.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={value === s.id}
              onClick={() => onPick(s.id)}
              className={cn(
                "h-12 rounded-xl border text-sm font-medium transition-colors",
                value === s.id
                  ? "border-ink bg-ink text-bone"
                  : "border-line bg-white hover:border-ink",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2 space-y-2 rounded-xl border border-line bg-bone/60 p-3">
          {sections.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <input
                value={names[s.id] ?? s.name}
                onChange={(e) => setNames((n) => ({ ...n, [s.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    rename(s);
                  }
                }}
                maxLength={30}
                aria-label={`Name of ${s.name}`}
                className={cn(input, "mt-0 h-11")}
              />
              <button
                type="button"
                disabled={busy || (names[s.id] ?? s.name).trim() === s.name}
                onClick={() => rename(s)}
                className={cn(button.secondary, "h-11 shrink-0 px-3 text-xs")}
              >
                Save
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(s)}
                aria-label={`Delete ${s.name}`}
                className={cn(button.danger, "h-11 shrink-0 px-3 text-xs")}
              >
                Delete
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 border-t border-line pt-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              maxLength={30}
              placeholder="New section, e.g. Kids"
              className={cn(input, "mt-0 h-11")}
            />
            <button
              type="button"
              disabled={busy || !newName.trim()}
              onClick={add}
              className={cn(button.primary, "h-11 shrink-0 whitespace-nowrap px-4 text-xs")}
            >
              + Add
            </button>
          </div>
          <p className="text-xs text-ink-faint">
            A section with products can&apos;t be deleted — move its products first.
          </p>
        </div>
      )}
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

/** "+ New category" next to the category list: adds it to the chosen section and selects it. */
export function CategoryQuickAdd({
  sections,
  categories,
  section,
  onAdded,
}: {
  sections: SectionRow[];
  categories: CategoryRow[];
  section: string;
  onAdded: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    const clean = name.trim();
    if (!clean) return;
    if (
      categories.some((c) => c.gender === section && c.name.toLowerCase() === clean.toLowerCase())
    ) {
      setError(`"${clean}" already exists.`);
      return;
    }
    const id = newCategoryId(clean, section, categories);
    setBusy(true);
    setError(null);
    try {
      await saveStructure(sections, [...categories, { id, name: clean, gender: section }]);
      setName("");
      setOpen(false);
      onAdded(id);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 block text-xs font-normal text-ink-soft underline"
      >
        + New category
      </button>
    );
  }
  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
          maxLength={40}
          placeholder="e.g. Lehenga"
          className={cn(input, "mt-0 h-10 text-sm")}
        />
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void add()}
          className={cn(button.primary, "h-10 px-3 text-xs")}
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={cn(button.secondary, "h-10 px-3 text-xs")}
        >
          ✕
        </button>
      </div>
      {error ? <p className="mt-1 text-xs font-normal text-red-700">{error}</p> : null}
    </div>
  );
}
