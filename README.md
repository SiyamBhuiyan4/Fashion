# MAISON — 3D virtual try-on (customer demo)

A customer-facing fashion store where every piece can be worn by a 3D model before buying.
The home page _is_ the fitting room: the model stays on the left while the men's collection runs
down the right, and the women's collection follows underneath. Nothing has to be clicked to switch
— scroll into the women's section and the model changes with you. Each model keeps its own outfit,
so scrolling back up finds the men's look still on. Tap **Wear** and the garment appears on the
body; rotate, zoom, change the skin tone, play a pose, and send the whole outfit to the cart.

Demo only: no login, no admin, no payment. Checkout says so.

## Stack

|            |                                                                           |
| ---------- | ------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router) · React 19 · TypeScript strict                    |
| 3D         | three.js · React Three Fiber · drei                                       |
| State      | Zustand (outfit, cart, preferences, catalogue)                            |
| Styling    | Tailwind CSS v4                                                           |
| Validation | zod — product data, URL parameters, and everything read back from storage |
| Data       | Telegram channel (encrypted JSON snapshot)                                |
| Media      | Telegram channel, served through `/api/tg/<file_id>.<ext>`                |

## The 3D is built in code

There are no `.glb` files. `lib/three/figure.ts` builds each avatar as a joint tree (hips → spine →
chest → neck → head, plus arms and legs) with one mesh per body part, exactly as a rigged model
would be split, and `lib/three/garments.ts` builds every garment by growing those same body
profiles outwards and parenting the result to the same joints — so sleeves follow elbows and
trouser legs follow knees without skinning or cloth simulation. Poses (Idle, Walk, Turn) are
animated in `lib/three/poses.ts`.

To move to real models later, swap `lib/three/figure.ts` for a loader that exposes the same joints
and profiles, drop the `.glb` files under `public/models/`, and run `npm run models:optimize`
(gltf-transform: meshopt + webp).

## Data and media live on Telegram

The whole database is one AES-256-GCM encrypted JSON document posted to a Telegram channel. The
pointer to the newest snapshot sits in the channel description:

```
[fashion-db] v=<version> m=<message_id> f=<file_id>
```

Writes take a lock on the same line (`[fashion-db-lock] …`). This channel is shared with another
app, which keeps its own `[smartdine-db]` pointer there: each app strips only its own lines and
writes everything else back untouched. **Never pin or unpin anything in that channel.**

Product artwork is rendered from the garment spec (`scripts/product-art.ts`), uploaded to the same
channel and referenced by a permanent same-origin link, `/api/tg/<file_id>.webp`, which streams the
file from Telegram and is cached by the CDN. The website only ever **reads** the database; the only
writer is `npm run db:seed`.

## Environment

Copy `.env.example` to `.env.local` (and set the same values in Vercel):

| Variable             | Meaning                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN` | Bot that is an administrator of the channel                            |
| `TELEGRAM_CHAT_ID`   | The channel id                                                         |
| `FASHION_DB_SECRET`  | 32+ random characters; encrypts the snapshot                           |
| `FASHION_DB_TAG`     | Pointer label, `fashion-db` (use `fashion-db-test` for throwaway runs) |

## Scripts

```bash
npm run dev            # development server
npm run build          # production build (pages are statically generated)
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run db:seed        # render artwork, upload it, write the catalogue to Telegram
npm run db:seed -- --dry    # render previews locally, upload nothing
npm run db:dump        # show what the database holds
npm run models:optimize     # compress any *.src.glb under public/models
```

## Routes

| Route            |                                                                     |
| ---------------- | ------------------------------------------------------------------- |
| `/`              | The shop: sticky 3D model, men's collection, then women's on scroll |
| `/men`, `/women` | Redirect to `/#men` and `/#women` (the old two-page layout)         |
| `/product/[id]`  | Detail: gallery, colours, sizes, stock, "Try on in 3D", add to cart |
| `/cart`          | Cart (localStorage), quantities, subtotal, demo checkout notice     |
| `/api/tg/[name]` | Permanent link to a file in the Telegram channel                    |

## Security notes

- Strict CSP and the usual hardening headers in `next.config.ts`.
- Everything read back from localStorage or a URL is re-validated with zod against the live
  catalogue before it is used.
- `/api/tg` only serves known media types, so the channel can never return an HTML document on
  this origin.
- The snapshot is rejected unless it decrypts with `FASHION_DB_SECRET`, so a leaked bot token
  cannot be used to plant a fake catalogue.
