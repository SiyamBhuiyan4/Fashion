import { formatPrice } from "@/lib/utils";

export function Price({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={className} suppressHydrationWarning>
      {formatPrice(amount)}
    </span>
  );
}
