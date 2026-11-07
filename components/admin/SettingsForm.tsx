"use client";

import { useState } from "react";
import { settingsSchema, type Settings } from "@/lib/settings";
import { waNumber } from "@/lib/whatsapp";
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

type NumberKey = {
  [K in keyof Settings]: Settings[K] extends number ? K : never;
}[keyof Settings];

const label = "block text-sm font-medium";
const hint = "mt-1 block text-xs font-normal text-ink-faint";
const digits = (text: string) => text.replace(/\D/g, "").replace(/^880/, "0").slice(0, 11);

export function SettingsForm() {
  const { data, error } = useAdminData<{ settings: Settings }>("/api/admin/settings");
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast, show } = useToast();

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;
  const s = draft ?? data.settings;
  const set = (patch: Partial<Settings>) => setDraft({ ...s, ...patch });

  // A plain function (not a component), so the inputs keep focus while typing.
  const numberField = (k: NumberKey, title: string, suffix: string) => (
    <label key={k} className={label}>
      {title}
      <div className="relative">
        <input
          inputMode="numeric"
          value={String(s[k])}
          onChange={(e) =>
            set({
              [k]: Math.floor(Number(e.target.value.replace(/\D/g, "")) || 0),
            } as Partial<Settings>)
          }
          className={cn(input, "pr-14")}
        />
        <span className="absolute right-3.5 top-1/2 mt-[3px] -translate-y-1/2 text-sm text-ink-faint">
          {suffix}
        </span>
      </div>
    </label>
  );

  const save = async () => {
    setSaveError(null);
    const parsed = settingsSchema.safeParse(s);
    if (!parsed.success) {
      setSaveError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setSaving(true);
    try {
      const res = await adminPost<{ settings: Settings }>("/api/admin/settings", parsed.data);
      setDraft(res.settings);
      show("Saved — the shop is updated");
    } catch (e) {
      setSaveError((e as Error).message);
    }
    setSaving(false);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <PageTitle title="Settings" subtitle="Changes show on the website as soon as you save." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="WhatsApp orders" className="border-[#1f9d55]/40">
          <label className={label}>
            WhatsApp number
            <input
              inputMode="tel"
              value={s.whatsapp}
              onChange={(e) => set({ whatsapp: digits(e.target.value) })}
              placeholder="01XXXXXXXXX"
              className={cn(input, "text-lg tracking-wider")}
            />
            <span className={hint}>
              Every &ldquo;Order on WhatsApp&rdquo; button sends the customer&apos;s order to this
              number.
            </span>
          </label>
          {/^01[3-9]\d{8}$/.test(s.whatsapp) ? (
            <a
              href={`https://wa.me/${waNumber(s.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-[#1f9d55] underline"
            >
              Test this number in WhatsApp ↗
            </a>
          ) : null}
        </Card>

        <Card title="Delivery charge">
          <div className="grid grid-cols-2 gap-4">
            {numberField("deliveryInsideDhaka", "Inside Dhaka", "৳")}
            {numberField("daysInsideDhaka", "Takes about", "days")}
            {numberField("deliveryOutsideDhaka", "Outside Dhaka", "৳")}
            {numberField("daysOutsideDhaka", "Takes about", "days")}
          </div>
          <p className="mt-3 text-xs text-ink-faint">Shown to customers on every product.</p>
        </Card>

        <Card title="Shop details">
          <div className="space-y-4">
            <label className={label}>
              Phone number
              <input
                inputMode="tel"
                value={s.phone}
                onChange={(e) => set({ phone: digits(e.target.value) })}
                className={input}
              />
              <span className={hint}>Shown in the footer. Leave empty to hide.</span>
            </label>
            <label className={label}>
              Address
              <input
                value={s.address}
                onChange={(e) => set({ address: e.target.value })}
                maxLength={160}
                className={input}
              />
            </label>
            <label className={label}>
              Facebook page link
              <input
                value={s.facebook}
                onChange={(e) => set({ facebook: e.target.value })}
                maxLength={200}
                className={input}
              />
            </label>
          </div>
        </Card>

        <Card title="Announcement">
          <label className={label}>
            Scrolling message
            <input
              value={s.announcement}
              onChange={(e) => set({ announcement: e.target.value })}
              maxLength={300}
              placeholder="Eid collection is here | New arrivals every week"
              className={input}
            />
            <span className={hint}>Separate messages with | . Leave empty for the default.</span>
          </label>
        </Card>
      </div>

      <div className="sticky bottom-16 z-20 -mx-4 mt-6 border-t border-line bg-bone/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0 lg:-mx-10 lg:px-10">
        <ErrorNote message={saveError} />
        <button
          type="submit"
          disabled={saving || draft === null}
          className={cn(button.primary, "w-full sm:w-auto", saveError && "mt-3")}
        >
          {saving ? "Saving…" : draft === null ? "No changes" : "Save settings"}
        </button>
      </div>
      {toast}
    </form>
  );
}
