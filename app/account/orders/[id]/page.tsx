import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetail } from "@/components/ui/OrderDetail";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <OrderDetail orderId={id} />
    </Suspense>
  );
}
