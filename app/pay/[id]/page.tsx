import type { Metadata } from "next";
import { Suspense } from "react";
import { PayDemo } from "@/components/ui/PayDemo";

export const metadata: Metadata = { title: "Payment" };

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <PayDemo orderId={id} />
    </Suspense>
  );
}
