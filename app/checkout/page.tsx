import type { Metadata } from "next";
import { Checkout } from "@/components/ui/Checkout";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <Checkout />;
}
