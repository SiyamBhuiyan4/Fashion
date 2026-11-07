import type { Metadata } from "next";
import { CartView } from "@/components/ui/CartView";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your selected pieces.",
};

export default function CartPage() {
  return <CartView />;
}
