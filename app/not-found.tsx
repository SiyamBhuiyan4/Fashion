import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60dvh] max-w-xl place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="display mt-3 text-3xl">We couldn&apos;t find that piece.</h1>
        <p className="mt-3 text-ink-soft">
          It may have sold out, or the link may be wrong. The collections are still here.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/men" className="rounded-full bg-ink px-5 py-2.5 text-sm text-bone hover:opacity-90">
            Shop men
          </Link>
          <Link
            href="/women"
            className="rounded-full border border-line bg-white px-5 py-2.5 text-sm hover:border-ink"
          >
            Shop women
          </Link>
        </div>
      </div>
    </div>
  );
}
