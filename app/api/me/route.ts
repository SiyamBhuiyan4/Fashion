/** The signed-in customer: account, wallet, notifications and waitlist, for the account UI. */
import { currentUser, publicUser } from "@/lib/server/auth";
import { json } from "@/lib/server/http";
import { timeline } from "@/lib/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await currentUser();
  if (!session) return json({ user: null });
  const { user, db } = session;
  const notifications = db.t.notifications
    .filter((n) => n.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json({
    user: publicUser(user),
    wallet: {
      balance: db.walletBalance(user.id),
      history: db.t.wallet
        .filter((w) => w.userId === user.id)
        .sort((a, b) => b.at.localeCompare(a.at)),
    },
    notifications,
    unread: notifications.filter((n) => !n.read).length,
    waitlist: db.t.waitlist
      .filter((w) => w.userId === user.id && !w.notifiedAt)
      .map((w) => ({ ...w, name: db.product(w.productId)?.name ?? w.productId })),
    orderCount: db.t.orders.filter((o) => o.userId === user.id && o.status === "CONFIRMED").length,
    // What fitted: every delivered piece, kept or sent back (and why), for size suggestions.
    sizeHistory: db.t.orders
      .filter((o) => o.userId === user.id && timeline(o).delivered)
      .flatMap((o) =>
        o.items.map((item, index) => {
          const product = db.product(item.productId);
          const kase = db.t.cases.find((c) => c.orderId === o.id && c.itemIndex === index);
          return {
            name: item.name,
            category: product?.category ?? "",
            kind: product?.garment.kind ?? "",
            gender: product?.gender ?? "",
            size: item.size,
            kept: !kase,
            reason:
              kase?.type === "return"
                ? kase.reason
                : kase
                  ? kase.newSize
                    ? "Exchanged"
                    : undefined
                  : undefined,
            at: o.confirmedAt ?? o.createdAt,
          };
        }),
      )
      .sort((a, b) => b.at.localeCompare(a.at)),
  });
}
