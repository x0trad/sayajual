import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');

function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(LISTINGS_FILE)) {
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify({ listings: [] }, null, 2), 'utf-8');
  }
}

export function readListingsStore() {
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

export function createListing({ sourceUrl, title, items }) {
  const store = readListingsStore();
  const safeTitle = title?.trim() || 'Threads Seller Listing';
  const baseSlug = slugify(safeTitle) || 'listing';
  const slug = createUniqueSlug(baseSlug, store.listings);

  const listing = {
    id: `lst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    slug,
    title: safeTitle,
    sourceUrl,
    items: sanitizeItems(items),
    createdAt: new Date().toISOString(),
  };

  store.listings.push(listing);
  writeListingsStore(store);

  return listing;
}

export function getListingBySlug(slug) {
  const store = readListingsStore();
  return store.listings.find((item) => item.slug === slug);
}

export function hasValidItems(items) {
  return sanitizeItems(items).length > 0;
}

export function normalizePublishedItems(items) {
  return sanitizeItems(items);
}
