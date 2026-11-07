/**
 * Orders go to the shop on WhatsApp: the bag (or one product) is written out as a message with
 * a link to every product, and wa.me opens the chat with it ready to send. The number is set by
 * the owner in the admin panel (Settings → WhatsApp number).
 */
import { sizeLabel } from "@/lib/adminProduct";
import type { Product } from "@/lib/schemas";
import { site } from "@/lib/site";

export interface OrderLine {
  product: Product;
  colorName: string;
  size: string;
  quantity: number;
}

const taka = (n: number) => `৳${n.toLocaleString("en-US")}`;

/** "01602066018" / "+880 1602-066018" → "8801602066018" (what wa.me expects). */
export function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return digits;
}

export function orderMessage(lines: OrderLine[], origin: string): string {
  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const body = lines.map((l, i) =>
    [
      `${i + 1}. ${l.product.name}`,
      `   Colour: ${l.colorName} · Size: ${sizeLabel(l.size)} · Qty: ${l.quantity}`,
      `   Price: ${taka(l.product.price)}${l.quantity > 1 ? ` × ${l.quantity} = ${taka(l.product.price * l.quantity)}` : ""}`,
      `   ${origin}/product/${l.product.id}`,
    ].join("\n"),
  );
  return [
    `Assalamu Alaikum, I want to order from ${site.name}:`,
    "",
    ...body.flatMap((b) => [b, ""]),
    `Total: ${taka(total)} (+ delivery charge)`,
    "",
    "Name:",
    "Phone:",
    "Address:",
  ].join("\n");
}

export function whatsappOrderUrl(phone: string, lines: OrderLine[], origin: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(orderMessage(lines, origin))}`;
}
