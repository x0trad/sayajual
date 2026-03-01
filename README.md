# Sayajual MVP

Mobile-first web app that turns a Threads selling post into a simple listing page with item name, price, and status (`AVAILABLE` / `SOLD`).

## Current Scope (v0.1)

- Paste Threads post URL
- Parse into preview items (`name`, `price`, `status`)
- Swipe left on item rows to reveal `Edit` and `Delete`
- Publish listing and get shareable URL
- Public listing page at `/l/:slug`

## Tech Stack

- Node.js HTTP server (no framework)
- Vanilla HTML/CSS/JS frontend
- Local JSON persistence for listings

## Run Locally

```bash
npm start
```

Server starts on port `3000` by default and auto-falls forward (`3001`, `3002`, ...) if occupied.

## Project Structure

- `index.html` - homepage UI
- `styles.css` - mobile-first styles
- `app.js` - frontend interactions (parse, swipe actions, publish)
- `server.js` - API routes, static serving, listing rendering
- `data/listings.json` - local published listings data (runtime)

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

## Notes

- Parse currently uses lightweight heuristic extraction with fallback sample data if parsing fails.
- Auth gate is not implemented yet.

## Next Milestones

1. Sign-in required before publish
2. Real AI structured extraction (replace heuristics)
3. Seller dashboard for post-publish status updates
