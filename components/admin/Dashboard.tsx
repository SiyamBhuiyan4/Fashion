"use client";

import Image from "next/image";
import Link from "next/link";
import { sizeLabel } from "@/lib/adminProduct";
import { Card, ErrorNote, Loading, PageTitle, button, useAdminData } from "@/components/admin/ui";

interface Overview {
  stats: { products: number; hidden: number; soldOut: number; pieces: number };
  whatsapp: string;
  lowStock: Array<{
    id: string;
    name: string;
    image?: string;
    sizes: Array<{ size: string; units: number }>;
  }>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function Dashboard() {
  const { data, error } = useAdminData<Overview>("/api/admin/overview");
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;
  const { stats } = data;

  return (
    <div>
      <PageTitle
        title="Dashboard"
        subtitle={`Orders arrive on WhatsApp: ${data.whatsapp}`}
        action={
          <Link href="/admin/products/new" className={button.gold}>
            + Add product
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Products in shop" value={String(stats.products)} />
        <Stat label="Pieces in stock" value={String(stats.pieces)} />
        <Stat label="Sold out" value={String(stats.soldOut)} />
        <Stat label="Hidden" value={String(stats.hidden)} />
      </div>

      {stats.products === 0 && stats.hidden === 0 ? (
        <Card className="mt-6">
          <p className="text-lg font-semibold">Welcome to your shop 👋</p>
          <p className="mt-1 text-sm text-ink-soft">
            The shop is empty. Add your first product with photos, sizes and stock — it shows up on
            the website right away, and customers order it on WhatsApp.
          </p>
          <Link href="/admin/products/new" className={`${button.primary} mt-4`}>
            Add your first product
          </Link>
        </Card>
      ) : null}

      <Card
        className="mt-6"
        title="Running low"
        action={
          <Link href="/admin/products" className="text-sm text-ink-soft underline">
            All products
          </Link>
        }
      >
        {data.lowStock.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-faint">Everything is well stocked.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.lowStock.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="flex items-center gap-3 py-2.5 hover:opacity-80"
                >
                  <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-bone-dark">
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        unoptimized
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-ink-soft">
                      {p.sizes
                        .filter((s) => s.units <= 2)
                        .map(
                          (s) =>
                            `${sizeLabel(s.size)}: ${s.units === 0 ? "sold out" : `${s.units} left`}`,
                        )
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="text-xs text-ink-soft">Update stock →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
