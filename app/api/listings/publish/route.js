import { NextResponse } from 'next/server';
import { createListing, hasValidItems, normalizePublishedItems } from '@/lib/listings';
import { isValidThreadsUrl } from '@/lib/parser';

export async function POST(request) {
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

    const listing = createListing({ sourceUrl, title, items });

    return NextResponse.json(
      {
        listingId: listing.id,
        slug: listing.slug,
        publicUrl: `/l/${listing.slug}`,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
}
