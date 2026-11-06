import Image from "next/image";
import Link from "next/link";
import { getCatalog } from "@/lib/products.server";
import { site } from "@/lib/site";

export const revalidate = 300;

const steps = [
  {
    title: "Choose",
    body: "Pick the men's or women's fitting room. A 3D model appears, ready to dress.",
  },
  {
    title: "Wear",
    body: "Tap Wear on anything. It lands on the model instantly — turn, zoom and judge the fit.",
  },
  {
    title: "Buy",
    body: "Happy with the look? Send the whole outfit to your cart in one go.",
  },
];

export default async function HomePage() {
  const catalog = await getCatalog();
  const menCard = catalog.find((p) => p.id === "m-wool-blazer") ?? catalog.find((p) => p.gender === "men");
  const womenCard =
    catalog.find((p) => p.id === "w-trench-coat") ?? catalog.find((p) => p.gender === "women");

  const cards = [
    { gender: "Men", href: "/men", product: menCard },
    { gender: "Women", href: "/women", product: womenCard },
  ];

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
        <p className="eyebrow">Fitting room · Dhaka</p>
        <h1 className="display mt-4 max-w-3xl text-4xl leading-[1.05] sm:text-6xl">
          See it on a body
          <span className="block text-accent">before you buy it.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-ink-soft sm:text-lg">{site.description}</p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6">
        {cards.map(({ gender, href, product }) => {
          const image = product?.colors[0]?.image;
          return (
            <Link
              key={gender}
              href={href}
              className="group relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-2xl border border-line bg-white p-6 transition-shadow hover:shadow-xl sm:min-h-[30rem]"
            >
              {image ? (
                <Image
                  src={image}
                  alt=""
                  fill
                  unoptimized
                  priority
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="-z-10 object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                />
              ) : null}
              <div className="-z-10 absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
              <h2 className="display text-3xl text-white sm:text-4xl">{gender}</h2>
              <p className="mt-1 text-sm text-white/80">
                {product ? `${product.name} and more` : "The full collection"}
              </p>
              <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink">
                Try it in 3D
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          );
        })}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="bg-bone p-6">
              <span className="eyebrow">Step {index + 1}</span>
              <h3 className="display mt-2 text-xl">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
