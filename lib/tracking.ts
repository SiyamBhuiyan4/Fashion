/**
 * Delivery tracking. A real courier posts its milestones to /api/courier/webhook and they are
 * shown as they arrive. Until one does (this is a demo store with no courier account), a demo
 * courier advances a confirmed order through the same milestones a few minutes apart, so the
 * tracking timeline, "delivered" reviews and returns can all be tried out.
 */
export const MILESTONES = [
  { status: "CONFIRMED", label: "Order confirmed" },
  { status: "PICKED_UP", label: "Picked up by courier" },
  { status: "IN_TRANSIT", label: "In transit" },
  { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { status: "DELIVERED", label: "Delivered" },
] as const;

const DEMO_STEP_MS = 2 * 60 * 1000;

export interface TrackableOrder {
  status: string;
  confirmedAt?: string;
  courierEvents?: Array<{ status: string; at: string; note?: string }>;
  shipments: Array<{ eta: string }>;
}

export interface Timeline {
  events: Array<{ status: string; label: string; at: string; note?: string }>;
  current: string;
  delivered: boolean;
  deliveredAt?: string;
  delayed: boolean;
  failed: boolean;
  demo: boolean;
}

const labelOf = (status: string) =>
  MILESTONES.find((m) => m.status === status)?.label ??
  (status === "DELIVERY_FAILED"
    ? "Delivery attempt failed"
    : status.replace(/_/g, " ").toLowerCase());

export function timeline(order: TrackableOrder, now = Date.now()): Timeline {
  if (order.status !== "CONFIRMED" || !order.confirmedAt) {
    return {
      events: [],
      current: order.status,
      delivered: false,
      delayed: false,
      failed: false,
      demo: false,
    };
  }
  let events: Timeline["events"];
  let demo = false;
  if (order.courierEvents && order.courierEvents.length > 0) {
    events = [
      { status: "CONFIRMED", label: labelOf("CONFIRMED"), at: order.confirmedAt },
      ...order.courierEvents.map((e) => ({ ...e, label: labelOf(e.status) })),
    ];
  } else {
    demo = true;
    const start = Date.parse(order.confirmedAt);
    events = MILESTONES.map((m, i) => ({
      status: m.status,
      label: m.label,
      at: new Date(start + i * DEMO_STEP_MS).toISOString(),
    })).filter((e) => Date.parse(e.at) <= now);
  }
  const last = events.at(-1)!;
  const delivered = last.status === "DELIVERED";
  const latestEta = order.shipments
    .map((s) => s.eta)
    .sort()
    .at(-1);
  const pastEta = Boolean(latestEta && now > Date.parse(`${latestEta}T23:59:59+06:00`));
  return {
    events,
    current: last.status,
    delivered,
    deliveredAt: delivered ? last.at : undefined,
    failed: last.status === "DELIVERY_FAILED",
    delayed: !delivered && (pastEta || last.status === "DELIVERY_FAILED"),
    demo,
  };
}
