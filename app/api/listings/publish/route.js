import { NextResponse } from 'next/server';
import { createListing, hasValidItems, normalizePublishedItems } from '@/lib/listings';
import { hasDatabaseConfig } from '@/lib/db';
import { isValidThreadsUrl } from '@/lib/parser';

export async function POST(request) {
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      { error: 'Database not configured. Set DATABASE_URL in environment variables.' },
      { status: 500 }
    );
  }

  try {
    const payload = await request.json();
    const sourceUrl = String(payload?.sourceUrl || '').trim();
    const title = String(payload?.title || 'Threads Seller Listing').trim();
    const items = normalizePublishedItems(payload?.items || []);

    if (!isValidThreadsUrl(sourceUrl)) {
      return NextResponse.json(
        { error: 'A valid Threads URL is required before publishing.' },
        { status: 400 }
      );
    }

    if (!hasValidItems(items)) {
      return NextResponse.json({ error: 'No valid items to publish.' }, { status: 400 });
    }

    const listing = await createListing({ sourceUrl, title, items });

    return NextResponse.json(
      {
        listingId: listing.id,
        slug: listing.slug,
        publicUrl: `/l/${listing.slug}`,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Unable to publish listing right now.' }, { status: 500 });
  }
}
