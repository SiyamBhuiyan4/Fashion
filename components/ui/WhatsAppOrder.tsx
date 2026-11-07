"use client";

import { whatsappOrderUrl, type OrderLine } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { useCatalogStore } from "@/store/catalogStore";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("h-5 w-5", className)} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3 1 2.6 1.1 2.7.1.2 1.9 2.9 4.6 4.1 1.7.7 2.4.8 3.3.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.3Z" />
    </svg>
  );
}

/**
 * Opens WhatsApp with the order typed out (products, sizes, quantities, prices and links).
 * `onSent` runs after the chat opens, e.g. to close the bag drawer.
 */
export function WhatsAppOrderButton({
  lines,
  label = "Order on WhatsApp",
  className,
  onSent,
}: {
  lines: OrderLine[];
  label?: string;
  className?: string;
  onSent?: () => void;
}) {
  const number = useCatalogStore((s) => s.settings.whatsapp);
  if (lines.length === 0 || !number) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const url = whatsappOrderUrl(number, lines, window.location.origin);
        window.open(url, "_blank", "noopener,noreferrer");
        onSent?.();
      }}
      className={cn(
        "flex h-13 w-full items-center justify-center gap-2.5 bg-[#1f9d55] px-5 text-sm font-medium text-white transition-colors hover:bg-[#178a49]",
        className,
      )}
    >
      <WhatsAppIcon />
      {label}
    </button>
  );
}
