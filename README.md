# Sayajual MVP

Mobile-first web app that turns a Threads selling post into a simple listing page with item name, price, and status (`AVAILABLE` / `SOLD`).

Now migrated to **Next.js + shadcn-style UI components**, **Postgres database storage**, and a **basic auth gate**.

## Current Scope (v0.3)

- Paste Threads post URL
- Parse into preview items (`name`, `price`, `status`)
- Swipe left on item rows to reveal `Edit` and `Delete`
- Sign in with email before publish
- Publish listing and get shareable URL
- Public listing page at `/l/:slug`

## Tech Stack

- Next.js App Router
- React
- Tailwind CSS
- shadcn-style UI primitives (`Button`, `Input`, `Card`, `StatusBadge`)
- Postgres (`pg`) for users, sessions, and listings

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

For AI extraction (recommended), also set:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default: `gpt-4.1-mini`)

## API Endpoints

### Auth

#### `POST /api/auth/login`
Request:

```json
{
  "email": "you@example.com",
  "name": "Kayla"
}
```

Response:

```json
{
  "user": {
    "id": "usr_xxx",
    "email": "you@example.com",
    "name": "Kayla"
  }
}
```

#### `GET /api/auth/me`
Response:

```json
{
  "user": {
    "id": "usr_xxx",
    "email": "you@example.com",
    "name": "Kayla"
  }
}
```

or

```json
{ "user": null }
```

#### `POST /api/auth/logout`
Clears session cookie.

### Parsing

#### `POST /api/parse`
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

### Publishing

#### `POST /api/listings/publish`
Auth required.

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

### Public Listing

#### `GET /l/:slug`
Returns a public mobile listing page.

## Notes

- Session auth is basic email-based MVP auth (no OAuth yet).
- Database schema is auto-created by app startup logic.
- Parser uses OpenAI extraction when `OPENAI_API_KEY` is set; otherwise it falls back to regex heuristics.

## Next Milestones

1. OAuth / passwordless auth provider
2. Owner-only dashboard for post-publish edits
3. Real AI structured extraction (replace heuristics)
