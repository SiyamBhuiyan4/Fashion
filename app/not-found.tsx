import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-dvh max-w-xl place-items-center px-4 text-center">
      <div>
        <Image
          src="/brand/mark-dark.png"
          alt="Aurevya"
          width={120}
          height={72}
          className="mx-auto h-auto w-24"
        />
        <p className="eyebrow mt-6">404</p>
        <h1 className="display mt-3 text-4xl">We couldn&apos;t find that piece.</h1>
        <p className="mt-3 text-ink-soft">
          It may have sold out, or the link may be wrong. The collection is still here.
        </p>
        <Link
          href="/#shop"
          className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm text-bone hover:opacity-90"
        >
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
