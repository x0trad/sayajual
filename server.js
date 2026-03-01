const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

const SAMPLE_ITEMS = [
  { name: 'Vintage Tee', price: 'RM35', status: 'AVAILABLE' },
  { name: 'Denim Jacket', price: 'RM80', status: 'SOLD' },
  { name: 'Canvas Tote', price: 'RM25', status: 'AVAILABLE' },
];

function sendJson(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(LISTINGS_FILE)) {
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify({ listings: [] }, null, 2), 'utf-8');
  }
}

function readListingsStore() {
  ensureDataStore();

  try {
    const raw = fs.readFileSync(LISTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.listings)) return { listings: [] };
    return parsed;
  } catch {
    return { listings: [] };
  }
}

function writeListingsStore(store) {
  ensureDataStore();
  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 56);
}

function createUniqueSlug(base, existingListings) {
  const existing = new Set(existingListings.map((item) => item.slug));
  let nextSlug = base || 'listing';
  let i = 2;

  while (existing.has(nextSlug)) {
    nextSlug = `${base || 'listing'}-${i}`;
    i += 1;
  }

  return nextSlug;
}

function normalizeItemStatus(status) {
  return String(status || '').toUpperCase() === 'SOLD' ? 'SOLD' : 'AVAILABLE';
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      name: String(item.name || '').trim(),
      price: String(item.price || '').trim(),
      status: normalizeItemStatus(item.status),
    }))
    .filter((item) => item.name && item.price)
    .slice(0, 100);
}

function renderPublicListingHtml(listing) {
  const rows = listing.items
    .map((item) => {
      const sold = item.status === 'SOLD';
      const statusClass = sold ? 'status-sold' : 'status-available';
      const nameClass = sold ? 'item-name sold' : 'item-name';

      return `
      <li class="item-row">
        <div class="item-main">
          <p class="${nameClass}">${escapeHtml(item.name)}</p>
          <p class="item-price">${escapeHtml(item.price)}</p>
        </div>
        <span class="status ${statusClass}"><span class="dot"></span>${item.status}</span>
      </li>`;
    })
    .join('');

  const sourceLink = escapeHtml(listing.sourceUrl);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(listing.title)} | Sayajual</title>
    <style>
      :root {
        --card: #ffffff;
        --line: #e2e7f2;
        --text: #111727;
        --muted: #586176;
        --accent: #28a36a;
        --sold: #8a4250;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Manrope, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
        background: radial-gradient(circle at top left, #eef2ff, #f7f8fc 48%, #f9fafc);
        color: var(--text);
      }
      main {
        width: min(100%, 430px);
        margin: 0 auto;
        padding: 20px 16px 28px;
      }
      .header, .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 20px;
        box-shadow: 0 10px 25px rgba(16, 27, 49, 0.08);
      }
      .header {
        padding: 16px 14px;
      }
      .header h1 {
        margin: 0;
        font-size: 22px;
      }
      .source {
        margin-top: 8px;
        font-size: 12px;
        color: var(--muted);
        word-break: break-all;
      }
      .source a { color: inherit; }
      .card {
        margin-top: 14px;
        overflow: hidden;
      }
      .item-row {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px;
        border-top: 1px solid var(--line);
      }
      .item-row:first-child { border-top: none; }
      .item-name {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
      }
      .item-name.sold {
        color: #6c7385;
        text-decoration: line-through;
      }
      .item-price {
        margin: 4px 0 0;
        font-size: 14px;
        color: var(--muted);
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.03em;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .status-available {
        color: #0c6e42;
        background: #dcfaea;
      }
      .status-available .dot { background: var(--accent); }
      .status-sold {
        color: #6f3342;
        background: #fbe8ee;
      }
      .status-sold .dot { background: var(--sold); }
    </style>
  </head>
  <body>
    <main>
      <section class="header">
        <h1>${escapeHtml(listing.title)}</h1>
        <p class="source">Source: <a href="${sourceLink}" target="_blank" rel="noreferrer">${sourceLink}</a></p>
      </section>

      <section class="card">
        <ul style="margin:0; padding:0;">
          ${rows || '<li class="item-row">No items found.</li>'}
        </ul>
      </section>
    </main>
  </body>
</html>`;
}

function isValidThreadsUrl(input) {
  try {
    const url = new URL(input);
    const validHosts = new Set(['threads.net', 'www.threads.net']);
    return (url.protocol === 'https:' || url.protocol === 'http:') && validHosts.has(url.hostname);
  } catch {
    return false;
  }
}

function normalizePrice(raw) {
  if (!raw) return 'Price not found';
  const clean = raw.replace(/\s+/g, '').toUpperCase();

  if (/^(RM|MYR)\d+(\.\d{1,2})?$/.test(clean)) {
    return clean.startsWith('MYR') ? `RM${clean.slice(3)}` : clean;
  }

  if (/^\d+(\.\d{1,2})?$/.test(clean)) {
    return `RM${clean}`;
  }

  return raw.trim();
}

function inferStatus(text) {
  const t = text.toLowerCase();
  if (/\b(sold|taken|booked|out)\b/.test(t)) return 'SOLD';
  return 'AVAILABLE';
}

function parseItemsFromText(text) {
  const lines = text
    .split(/\n|•|\u2022|\||;/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  const priceRegex = /((?:RM|MYR)\s?\d+(?:\.\d{1,2})?|\b\d+(?:\.\d{1,2})?\b)/i;

  for (const line of lines) {
    const priceMatch = line.match(priceRegex);
    if (!priceMatch) continue;

    const priceRaw = priceMatch[1];
    const name = line
      .replace(priceRaw, '')
      .replace(/[-,:()]/g, ' ')
      .replace(/\b(available|sold|rm|myr)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!name || name.length < 2) continue;

    items.push({
      name,
      price: normalizePrice(priceRaw),
      status: inferStatus(line),
    });

    if (items.length >= 20) break;
  }

  return items;
}

function extractTextFromHtml(html) {
  const metaDescription = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] || '';
  const ogDescription = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] || '';
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';

  return [metaDescription, ogDescription, title].filter(Boolean).join('\n');
}

async function parseThreadsPost(url) {
  const warnings = [];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SayajualBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      warnings.push(`Unable to fetch post content (${response.status}).`);
      return { items: SAMPLE_ITEMS, warnings, usedSample: true };
    }

    const html = await response.text();
    const extractedText = extractTextFromHtml(html);

    if (!extractedText) {
      warnings.push('No readable post text found. Showing a sample preview.');
      return { items: SAMPLE_ITEMS, warnings, usedSample: true };
    }

    const parsedItems = parseItemsFromText(extractedText);

    if (!parsedItems.length) {
      warnings.push('Could not detect item + price pairs. Showing a sample preview.');
      return { items: SAMPLE_ITEMS, warnings, usedSample: true };
    }

    return { items: parsedItems, warnings, usedSample: false };
  } catch {
    warnings.push('Post fetch failed. Showing a sample preview.');
    return { items: SAMPLE_ITEMS, warnings, usedSample: true };
  }
}

function serveStatic(pathname, res) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(ROOT, `.${safePath}`);

  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

async function requestHandler(req, res) {
  const requestUrl = new URL(req.url, 'http://localhost');
  const pathname = requestUrl.pathname;

  if (req.method === 'POST' && pathname === '/api/parse') {
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body || '{}');
      const threadUrl = (payload.threadUrl || '').trim();

      if (!threadUrl) {
        sendJson(res, 400, { error: 'Thread URL is required.' });
        return;
      }

      if (!isValidThreadsUrl(threadUrl)) {
        sendJson(res, 400, { error: 'Please use a valid Threads post URL.' });
        return;
      }

      const result = await parseThreadsPost(threadUrl);
      sendJson(res, 200, {
        sourceUrl: threadUrl,
        items: result.items,
        warnings: result.warnings,
        usedSample: result.usedSample,
      });
    } catch {
      sendJson(res, 400, { error: 'Invalid request payload.' });
    }

    return;
  }

  if (req.method === 'POST' && pathname === '/api/listings/publish') {
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body || '{}');
      const sourceUrl = (payload.sourceUrl || '').trim();
      const sanitizedItems = sanitizeItems(payload.items);

      if (!isValidThreadsUrl(sourceUrl)) {
        sendJson(res, 400, { error: 'A valid Threads URL is required before publishing.' });
        return;
      }

      if (!sanitizedItems.length) {
        sendJson(res, 400, { error: 'No valid items to publish.' });
        return;
      }

      const store = readListingsStore();
      const title = payload.title?.trim() || 'Threads Seller Listing';
      const baseSlug = slugify(title) || 'listing';
      const slug = createUniqueSlug(baseSlug, store.listings);

      const listing = {
        id: `lst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        slug,
        title,
        sourceUrl,
        items: sanitizedItems,
        createdAt: new Date().toISOString(),
      };

      store.listings.push(listing);
      writeListingsStore(store);

      sendJson(res, 201, {
        listingId: listing.id,
        slug: listing.slug,
        publicUrl: `/l/${listing.slug}`,
      });
    } catch {
      sendJson(res, 400, { error: 'Invalid request payload.' });
    }

    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/l/')) {
    const slug = pathname.slice(3).trim();
    const store = readListingsStore();
    const listing = store.listings.find((item) => item.slug === slug);

    if (!listing) {
      sendJson(res, 404, { error: 'Listing not found' });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderPublicListingHtml(listing));
    return;
  }

  if (req.method === 'GET') {
    serveStatic(pathname, res);
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}

function startServer(preferredPort) {
  const tryPort = (port) => {
    const server = http.createServer(requestHandler);

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is in use, retrying on ${port + 1}...`);
        tryPort(port + 1);
        return;
      }

      console.error('Server failed to start:', err);
      process.exit(1);
    });

    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  };

  tryPort(preferredPort);
}

startServer(PORT);
