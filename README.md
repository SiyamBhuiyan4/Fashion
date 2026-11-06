# MAISON — fashion store with product videos (customer demo)

A customer-facing fashion store. Both collections live on one page: men's first, women's as you
keep scrolling. Products that have a video show a **Video** badge; on a computer, hovering the card
plays it muted in place of the photo, and the product page opens with the video (photos per
colourway underneath it). Pick colour and size, add to cart.

Demo only: no login, no admin, no payment. Checkout says so.

## Stack

|            |                                                                           |
| ---------- | ------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router) · React 19 · TypeScript strict                    |
| State      | Zustand (cart, catalogue, active section)                                 |
| Styling    | Tailwind CSS v4                                                           |
| Validation | zod — product data, URL parameters, and everything read back from storage |
| Data       | Telegram channel (encrypted JSON snapshot)                                |
| Media      | Telegram channel, served through `/api/tg/<file_id>.<ext>`                |
| Video      | HLS via hls.js; cut with ffmpeg (`ffmpeg-static`) in the upload script    |

## Product videos

1. Put each video in `videos/` (git-ignored), named after the product id:
   `videos/m-tee-essential.mp4`, `videos/w-slip-dress.mov` … (`.mp4 .mov .m4v .webm .mkv`).
   `npm run db:dump` lists the ids.
2. `npm run videos:upload` — or `-- --dry` to cut them into `scripts/.preview` without uploading,
   `-- --force` to redo unchanged files, `-- --remove <id>` to take a video off the site.

Telegram only lets a bot **download** files up to 20 MB, and the site streams every file through
the bot. So videos are not shrunk to fit — they are **cut into pieces** (HLS, the format YouTube and
Netflix use) by `scripts/video-hls.ts`, every piece under 19 MB, and the player joins them back:

- **No length limit, best quality capped at 1080p** (more only makes the site slow). H.264 sources
  up to 1080p are cut _without re-encoding_ (every pixel kept); other codecs (iPhone HEVC, which
  Chrome cannot play) and 2K/4K sources are encoded once at CRF 18 (visually lossless), at the
  original size or down to 1080p.
- **Extra smaller levels** (720p / 480p, never above the top one) are added for slow
  connections. The player starts at the best level and only steps down when the connection cannot
  keep up. All levels are cut at the same moments, so switching is seamless.
- Pieces are 6 s long. If a piece of a very high bitrate source comes out over the limit, it is cut
  again with proportionally shorter pieces; if the source's own keyframes are too far apart for
  that, it is encoded at CRF 18 with a keyframe at every cut instead.

Playlists are built on the fly by `/api/video/<id>/master.m3u8` (and `/<level>.m3u8`) from the
`videos` table; each piece is `/api/tg/<file_id>.ts`. Safari/iOS play HLS natively, other browsers
use hls.js (`components/ui/VideoPlayer.tsx`, loaded only when a video plays). Videos are kept in
their own `videos` table, so `npm run db:seed` never removes them. Uploads resume: finished pieces
are remembered in `videos/.uploaded.json`.

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
file from Telegram and is cached by the CDN (byte ranges are passed through, so videos can seek).
The website only ever **reads** the database; the only writers are `npm run db:seed` (products and
artwork) and `npm run videos:upload` (videos).

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
npm run videos:upload  # cut every video in videos/ into pieces and put it on the site
npm run video:hls -- in.mov out-dir   # cut one file locally, upload nothing
```

## Routes

| Route            |                                                                 |
| ---------------- | --------------------------------------------------------------- |
| `/`              | The shop: men's collection, then women's on scroll              |
| `/men`, `/women` | Redirect to `/#men` and `/#women` (the old two-page layout)     |
| `/product/[id]`  | Detail: video, photos, colours, sizes, stock, add to cart       |
| `/cart`          | Cart (localStorage), quantities, subtotal, demo checkout notice |
| `/api/tg/[name]` | Permanent link to a file in the Telegram channel                |

## Security notes

- Strict CSP and the usual hardening headers in `next.config.ts`.
- Everything read back from localStorage or a URL is re-validated with zod against the live
  catalogue before it is used.
- `/api/tg` only serves known media types, so the channel can never return an HTML document on
  this origin.
- The snapshot is rejected unless it decrypts with `FASHION_DB_SECRET`, so a leaked bot token
  cannot be used to plant a fake catalogue.
