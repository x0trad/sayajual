# Sayajual MVP

Mobile-first web app that turns a Threads selling post into a simple listing page with item name, price, and status (`AVAILABLE` / `SOLD`).

Now migrated to **Next.js + shadcn-style UI components** and **Postgres database storage**.

## Current Scope (v0.2)

- Paste Threads post URL
- Parse into preview items (`name`, `price`, `status`)
- Swipe left on item rows to reveal `Edit` and `Delete`
- Publish listing and get shareable URL
- Public listing page at `/l/:slug`

## Tech Stack

- Next.js App Router
- React
- Tailwind CSS
- shadcn-style UI primitives (`Button`, `Input`, `Card`, `StatusBadge`)
- Postgres (`pg`) for listing persistence

## Run Locally

1. Set database connection string:

```bash
export DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DB"
```

2. Install and run:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## Vercel Environment Variables

Set one of these in your Vercel project:

- `DATABASE_URL` (preferred)
- `POSTGRES_URL` (fallback)

Without this, publish and public listing pages will fail intentionally.

## Project Structure

- `app/page.jsx` - homepage UI and swipe interactions
- `app/l/[slug]/page.jsx` - public listing page
- `app/api/parse/route.js` - parse endpoint
- `app/api/listings/publish/route.js` - publish endpoint
- `components/ui/*` - shadcn-style primitives
- `lib/parser.js` - Threads parsing logic
- `lib/db.js` - Postgres pool + schema bootstrap
- `lib/listings.js` - listing queries/writes

## API Endpoints

### `POST /api/parse`
Request:

```json
{
  "threadUrl": "https://www.threads.net/@username/post/..."
}
```

Response:

```json
{
  "sourceUrl": "https://www.threads.net/@username/post/...",
  "items": [
    { "name": "Vintage Tee", "price": "RM35", "status": "AVAILABLE" }
  ],
  "warnings": [],
  "usedSample": false
}
```

### `POST /api/listings/publish`
Request:

```json
{
  "sourceUrl": "https://www.threads.net/@username/post/...",
  "title": "Threads Seller Listing",
  "items": [
    { "name": "Vintage Tee", "price": "RM35", "status": "AVAILABLE" }
  ]
}
```

Response:

```json
{
  "listingId": "lst_xxx",
  "slug": "threads-seller-listing",
  "publicUrl": "/l/threads-seller-listing"
}
```

### `GET /l/:slug`
Returns a public mobile listing page.

## Next Milestones

1. Sign-in required before publish
2. Real AI structured extraction (replace heuristics)
3. Seller dashboard for post-publish status updates
