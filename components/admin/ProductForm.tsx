"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  adminProductSchema,
  garmentDefaults,
  FABRIC_LABELS,
  KIND_LABELS,
  SIZE_PRESETS,
  sizeLabel,
} from "@/lib/adminProduct";
import { sectionName, type SectionRow } from "@/lib/sections";
import { categoriesFor, categoryName, type CategoryRow } from "@/lib/categories";
import type { Category, Fabric, GarmentKind, Gender } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { CategoryQuickAdd, SectionPicker } from "@/components/admin/SectionPicker";
import type { AdminProduct } from "@/components/admin/ProductsList";
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

const SWATCHES: Array<[string, string]> = [
  ["Black", "#111111"],
  ["White", "#f4f1ea"],
  ["Off-white", "#ece4d2"],
  ["Beige", "#d6c09c"],
  ["Golden", "#c49a45"],
  ["Red", "#b3202a"],
  ["Maroon", "#6d1a2a"],
  ["Pink", "#e8a3b5"],
  ["Peach", "#f2b996"],
  ["Orange", "#e07a2e"],
  ["Yellow", "#e8c547"],
  ["Green", "#2f6b45"],
  ["Mint", "#a8d8c0"],
  ["Olive", "#6b6b3a"],
  ["Sky blue", "#8cc2e8"],
  ["Blue", "#2d4f8a"],
  ["Navy", "#1d2a44"],
  ["Purple", "#6b3f8a"],
  ["Lilac", "#c3a6d8"],
  ["Grey", "#8a8a8a"],
  ["Brown", "#6b4a32"],
];

interface ColorRow {
  name: string;
  hex: string;
  image?: string;
}

const label = "block text-sm font-medium";

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const { data, error: loadError } = useAdminData<{ products: AdminProduct[] }>(
    productId ? "/api/admin/products" : null,
  );
  const existing = productId ? data?.products.find((p) => p.id === productId) : undefined;
  const { data: catData, reload: reloadCategories } = useAdminData<{
    categories: CategoryRow[];
    sections: SectionRow[];
  }>("/api/admin/categories");
  const categories = catData?.categories ?? [];
  const sections = catData?.sections ?? [];

  const [loaded, setLoaded] = useState(!productId);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("women");
  const [sectionChosen, setSectionChosen] = useState(false);
  const [category, setCategory] = useState<Category>("saree");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [colors, setColors] = useState<ColorRow[]>([{ name: "", hex: "#111111" }]);
  const [sizes, setSizes] = useState<string[]>(["FREE"]);
  const [stock, setStock] = useState<Record<string, string>>({ FREE: "1" });
  const [extras, setExtras] = useState<string[]>([]);
  const [kind, setKind] = useState<GarmentKind>(garmentDefaults("women", "saree").kind);
  const [fabric, setFabric] = useState<Fabric>(garmentDefaults("women", "saree").fabric);
  const [tags, setTags] = useState("");
  const [hidden, setHidden] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [more, setMore] = useState(false);
  const { toast, show } = useToast();

  // Fill the form once the product has loaded.
  useEffect(() => {
    if (loaded || !existing) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time copy of loaded data into the form */
    setName(existing.name);
    setGender(existing.gender);
    setCategory(existing.category);
    setPrice(String(existing.price));
    setDescription(existing.description);
    setColors(existing.colors.map((c) => ({ name: c.name, hex: c.hex, image: c.image })));
    setSizes(existing.sizes);
    setStock(Object.fromEntries(existing.sizes.map((s) => [s, String(existing.stock[s] ?? 0)])));
    const colorImages = new Set(existing.colors.map((c) => c.image));
    setExtras((existing.images ?? []).filter((i) => !colorImages.has(i)));
    setKind(existing.garment.kind);
    setFabric(existing.garment.fabric);
    setTags((existing.tags ?? []).join(", "));
    setHidden(Boolean(existing.hidden));
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [existing, loaded]);

  if (productId && loadError) return <ErrorNote message={loadError} />;
  if (productId && !data) return <Loading />;
  if (productId && data && !existing) {
    return (
      <div className="py-16 text-center">
        <p>This product no longer exists.</p>
        <Link href="/admin/products" className={cn(button.secondary, "mt-4")}>
          Back to products
        </Link>
      </div>
    );
  }
  if (!loaded) return <Loading />;

  const setColor = (i: number, patch: Partial<ColorRow>) =>
    setColors((list) => list.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const applySizes = (next: string[]) => {
    setSizes(next);
    setStock((old) => Object.fromEntries(next.map((s) => [s, old[s] ?? "0"])));
  };

  const addCustomSize = () => {
    const size = customSize.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9.]{1,8}$/.test(size)) {
      setError("A size can use letters and numbers only, up to 8 characters (e.g. 3XL, 42).");
      return;
    }
    if (!sizes.includes(size)) applySizes([...sizes, size]);
    setCustomSize("");
    setError(null);
  };

  const pickCategory = (next: Category, forGender: Gender = gender) => {
    setCategory(next);
    if (!existing) {
      setKind(garmentDefaults(forGender, next).kind);
      setFabric(garmentDefaults(forGender, next).fabric);
    }
  };

  // A new product starts in the first section once the owner's sections have loaded.
  if (
    !existing &&
    !sectionChosen &&
    sections.length > 0 &&
    !sections.some((x) => x.id === gender)
  ) {
    setSectionChosen(true);
    setGender(sections[0]!.id);
    const first = categoriesFor(categories, sections[0]!.id)[0];
    if (first) setCategory(first.id);
  }

  const pickGender = (next: Gender) => {
    setGender(next);
    // Keep the category if the other section has it too, otherwise take that section's first.
    const own = categoriesFor(categories, next);
    if (!own.some((c) => c.id === category) && own[0]) pickCategory(own[0].id, next);
  };

  const save = async () => {
    setError(null);
    const body = {
      id: existing?.id,
      name,
      gender,
      category,
      price: Number(price.replace(/[,\s৳]/g, "")),
      description,
      colors: colors.map((c) => ({ name: c.name.trim(), hex: c.hex, image: c.image })),
      sizes,
      stock: Object.fromEntries(
        sizes.map((s) => [s, Math.max(0, Math.floor(Number(stock[s]) || 0))]),
      ),
      images: extras,
      kind,
      fabric,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 6),
      hidden,
    };
    if (colors.some((c) => !c.name.trim())) {
      setError("Give every colour a name (e.g. Black, Maroon).");
      return;
    }
    if (!existing && !categoriesFor(categories, gender).some((c) => c.id === category)) {
      setError(
        `Choose a category. (Make one first under Categories if ${sectionName(sections, gender)} has none.)`,
      );
      return;
    }
    if (!colors.some((c) => c.image) && extras.length === 0) {
      setError("Add at least one photo so customers can see the piece.");
      return;
    }
    const parsed = adminProductSchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setSaving(true);
    try {
      await adminPost("/api/admin/products", parsed.data);
      show(existing ? "Saved" : "Product added to the shop");
      router.push("/admin/products");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setSaving(true);
    try {
      await adminPost("/api/admin/products/delete", { id: existing.id });
      router.push("/admin/products");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const kinds = Object.keys(KIND_LABELS) as GarmentKind[];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Link href="/admin/products" className="text-sm text-ink-soft">
        ← Products
      </Link>
      <PageTitle
        title={existing ? "Edit product" : "Add product"}
        subtitle={existing ? `ID: ${existing.id}` : "It appears in the shop as soon as you save."}
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card title="Basics">
            <div className="space-y-4">
              <SectionPicker
                sections={sections}
                categories={categories}
                value={gender}
                onPick={pickGender}
                onChanged={reloadCategories}
              />
              <label className={label}>
                Product name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maroon Katan Saree"
                  className={input}
                  maxLength={80}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className={label}>
                  <span>Category</span>
                  <select
                    aria-label="Category"
                    value={category}
                    onChange={(e) => pickCategory(e.target.value as Category)}
                    className={input}
                  >
                    {categoriesFor(categories, gender).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    {!categoriesFor(categories, gender).some((c) => c.id === category) ? (
                      <option value={category}>
                        {existing ? categoryName(categories, category, gender) : "Choose…"}
                      </option>
                    ) : null}
                  </select>
                  <CategoryQuickAdd
                    sections={sections}
                    categories={categories}
                    section={gender}
                    onAdded={(id) => {
                      reloadCategories();
                      setCategory(id);
                    }}
                  />
                </div>
                <label className={label}>
                  Price (৳)
                  <input
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="2450"
                    className={input}
                  />
                </label>
              </div>
              <label className={label}>
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  maxLength={1000}
                  placeholder="Fabric, work, length, what it comes with (e.g. blouse piece), care…"
                  className={cn(input, "h-auto py-3 leading-relaxed")}
                />
                <span className="mt-1 block text-right text-xs font-normal text-ink-faint">
                  {description.length}/1000
                </span>
              </label>
            </div>
          </Card>

          <Card title="Colours & photos">
            <p className="-mt-2 mb-4 text-sm text-ink-soft">
              One photo per colour. Customers tap a colour to see its photo.
            </p>
            <div className="space-y-4">
              {colors.map((color, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-line p-3">
                  <ImagePicker
                    value={color.image}
                    onChange={(url) => setColor(i, { image: url })}
                    className="w-24 shrink-0 sm:w-28"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color.hex}
                        onChange={(e) => setColor(i, { hex: e.target.value })}
                        aria-label="Colour"
                        className="h-12 w-12 shrink-0 cursor-pointer rounded-xl border border-line bg-white p-1"
                      />
                      <input
                        value={color.name}
                        onChange={(e) => setColor(i, { name: e.target.value })}
                        placeholder="Colour name"
                        maxLength={40}
                        className={cn(input, "mt-0")}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SWATCHES.map(([swatchName, hex]) => (
                        <button
                          key={swatchName}
                          type="button"
                          title={swatchName}
                          aria-label={swatchName}
                          onClick={() => setColor(i, { name: swatchName, hex })}
                          className={cn(
                            "h-6 w-6 rounded-full border border-black/10",
                            color.hex.toLowerCase() === hex && "ring-2 ring-ink ring-offset-1",
                          )}
                          style={{ background: hex }}
                        />
                      ))}
                    </div>
                    {colors.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setColors((list) => list.filter((_, j) => j !== i))}
                        className="text-xs text-red-700"
                      >
                        Remove this colour
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            {colors.length < 8 ? (
              <button
                type="button"
                onClick={() => setColors((list) => [...list, { name: "", hex: "#c49a45" }])}
                className={cn(button.secondary, "mt-4")}
              >
                + Add another colour
              </button>
            ) : null}

            <p className="mt-6 text-sm font-medium">More photos (back, close-up, worn)</p>
            <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {extras.map((url, i) => (
                <ImagePicker
                  key={url}
                  value={url}
                  onChange={(next) =>
                    setExtras((list) =>
                      next
                        ? list.map((u, j) => (j === i ? next : u))
                        : list.filter((_, j) => j !== i),
                    )
                  }
                />
              ))}
              {extras.length < 8 ? (
                <ImagePicker
                  key={`new-${extras.length}`}
                  onChange={(url) => url && setExtras((list) => [...list, url])}
                  label="Add more"
                />
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Sizes & stock">
            <p className="-mt-2 mb-3 text-sm text-ink-soft">Quick pick:</p>
            <div className="flex flex-wrap gap-2">
              {SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applySizes(preset.sizes)}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-sm",
                    preset.sizes.join() === sizes.join()
                      ? "border-ink bg-ink text-bone"
                      : "border-line bg-white",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-5 divide-y divide-line rounded-xl border border-line">
              {sizes.map((size) => (
                <div key={size} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-20 text-sm font-medium">{sizeLabel(size)}</span>
                  <div className="flex flex-1 items-center justify-end gap-2">
                    <button
                      type="button"
                      aria-label={`One less ${sizeLabel(size)}`}
                      onClick={() =>
                        setStock((s) => ({
                          ...s,
                          [size]: String(Math.max(0, (Number(s[size]) || 0) - 1)),
                        }))
                      }
                      className="grid h-10 w-10 place-items-center rounded-lg border border-line text-lg"
                    >
                      −
                    </button>
                    <input
                      inputMode="numeric"
                      aria-label={`Stock for ${sizeLabel(size)}`}
                      value={stock[size] ?? "0"}
                      onChange={(e) =>
                        setStock((s) => ({ ...s, [size]: e.target.value.replace(/\D/g, "") }))
                      }
                      className="h-10 w-16 rounded-lg border border-line text-center tabular-nums outline-none focus:border-ink"
                    />
                    <button
                      type="button"
                      aria-label={`One more ${sizeLabel(size)}`}
                      onClick={() =>
                        setStock((s) => ({ ...s, [size]: String((Number(s[size]) || 0) + 1) }))
                      }
                      className="grid h-10 w-10 place-items-center rounded-lg border border-line text-lg"
                    >
                      +
                    </button>
                    {sizes.length > 1 ? (
                      <button
                        type="button"
                        aria-label={`Remove size ${sizeLabel(size)}`}
                        onClick={() => applySizes(sizes.filter((s) => s !== size))}
                        className="ml-1 text-ink-faint hover:text-red-700"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomSize();
                  }
                }}
                placeholder="Other size, e.g. 3XL"
                className={cn(input, "mt-0")}
              />
              <button type="button" onClick={addCustomSize} className={button.secondary}>
                Add
              </button>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              Orders come on WhatsApp, so update the stock here when you sell a piece.
            </p>
          </Card>

          <Card title="Visibility">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Show in the shop</span>
                <span className="block text-xs text-ink-soft">
                  Turn off to keep it here without customers seeing it.
                </span>
              </span>
              <input
                type="checkbox"
                checked={!hidden}
                onChange={(e) => setHidden(!e.target.checked)}
                className="h-6 w-6 accent-ink"
              />
            </label>
          </Card>

          <Card>
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              className="flex w-full items-center justify-between text-sm font-medium"
            >
              More details (optional)
              <span aria-hidden>{more ? "−" : "+"}</span>
            </button>
            {more ? (
              <div className="mt-4 space-y-4">
                <label className={label}>
                  Type
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as GarmentKind)}
                    className={input}
                  >
                    {kinds.map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  Fabric
                  <select
                    value={fabric}
                    onChange={(e) => setFabric(e.target.value as Fabric)}
                    className={input}
                  >
                    {(Object.keys(FABRIC_LABELS) as Fabric[]).map((f) => (
                      <option key={f} value={f}>
                        {FABRIC_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  Search words
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="eid, party, wedding"
                    className={input}
                  />
                  <span className="mt-1 block text-xs font-normal text-ink-faint">
                    Separate with commas, up to 6. Helps customers find it in search.
                  </span>
                </label>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="sticky bottom-16 z-20 -mx-4 mt-6 border-t border-line bg-bone/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0 lg:-mx-10 lg:px-10">
        <ErrorNote message={error} />
        <div className={cn("flex flex-wrap items-center gap-2", error && "mt-3")}>
          <button
            type="submit"
            disabled={saving}
            className={cn(button.primary, "flex-1 sm:flex-none")}
          >
            {saving ? "Saving…" : existing ? "Save changes" : "Add to shop"}
          </button>
          <Link href="/admin/products" className={button.secondary}>
            Cancel
          </Link>
          {existing ? (
            confirmDelete ? (
              <span className="ml-auto flex items-center gap-2 text-sm">
                Delete for good?
                <button type="button" disabled={saving} onClick={remove} className={button.danger}>
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className={button.secondary}
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className={cn(button.danger, "ml-auto")}
              >
                Delete
              </button>
            )
          ) : null}
        </div>
      </div>
      {toast}
    </form>
  );
}
