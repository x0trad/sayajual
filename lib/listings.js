import { ensureSchema, getPool } from '@/lib/db';

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 56);
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

async function createUniqueSlug(base) {
  const db = getPool();
  let candidate = base || 'listing';
  let i = 2;

  while (true) {
    const existing = await db.query('SELECT 1 FROM listings WHERE slug = $1 LIMIT 1', [candidate]);
    if (existing.rowCount === 0) return candidate;
    candidate = `${base || 'listing'}-${i}`;
    i += 1;
  }
}

export async function createListing({ ownerId, sourceUrl, title, items }) {
  await ensureSchema();

  const db = getPool();
  const safeTitle = title?.trim() || 'Threads Seller Listing';
  const baseSlug = slugify(safeTitle) || 'listing';
  const slug = await createUniqueSlug(baseSlug);
  const normalizedItems = sanitizeItems(items);

  const listing = {
    id: `lst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    slug,
    ownerId,
    title: safeTitle,
    sourceUrl,
    items: normalizedItems,
    createdAt: new Date().toISOString(),
  };

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `
      INSERT INTO listings (id, slug, owner_id, title, source_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        listing.id,
        listing.slug,
        listing.ownerId || null,
        listing.title,
        listing.sourceUrl,
        listing.createdAt,
      ]
    );

    for (let index = 0; index < listing.items.length; index += 1) {
      const item = listing.items[index];
      await client.query(
        `
        INSERT INTO listing_items (id, listing_id, name, price, status, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          `itm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}_${index}`,
          listing.id,
          item.name,
          item.price,
          item.status,
          index,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return listing;
}

export async function getListingBySlug(slug) {
  await ensureSchema();
  const db = getPool();

  const listingRes = await db.query(
    `
    SELECT id, slug, owner_id, title, source_url, created_at
    FROM listings
    WHERE slug = $1
    LIMIT 1
    `,
    [slug]
  );

  if (listingRes.rowCount === 0) return null;

  const listingRow = listingRes.rows[0];

  const itemsRes = await db.query(
    `
    SELECT name, price, status
    FROM listing_items
    WHERE listing_id = $1
    ORDER BY sort_order ASC
    `,
    [listingRow.id]
  );

  return {
    id: listingRow.id,
    slug: listingRow.slug,
    ownerId: listingRow.owner_id,
    title: listingRow.title,
    sourceUrl: listingRow.source_url,
    createdAt: listingRow.created_at,
    items: itemsRes.rows,
  };
}

export async function getListingsByOwner(ownerId) {
  if (!ownerId) return [];

  await ensureSchema();
  const db = getPool();

  const result = await db.query(
    `
    SELECT id, slug, title, source_url, created_at
    FROM listings
    WHERE owner_id = $1
    ORDER BY created_at DESC
    `,
    [ownerId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    sourceUrl: row.source_url,
    createdAt: row.created_at,
  }));
}

export function hasValidItems(items) {
  return sanitizeItems(items).length > 0;
}

export function normalizePublishedItems(items) {
  return sanitizeItems(items);
}
