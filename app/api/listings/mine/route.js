import { NextResponse } from 'next/server';
import { hasDatabaseConfig } from '@/lib/db';
import { getSessionCookieName, getUserBySessionToken } from '@/lib/auth';
import { getListingsByOwner } from '@/lib/listings';

export async function GET(request) {
  if (!hasDatabaseConfig()) {
    return NextResponse.json({ listings: [] });
  }

  try {
    const token = request.cookies.get(getSessionCookieName())?.value;
    const user = await getUserBySessionToken(token);

    if (!user) {
      return NextResponse.json({ listings: [] });
    }

    const listings = await getListingsByOwner(user.id);
    return NextResponse.json({ listings });
  } catch {
    return NextResponse.json({ listings: [] });
  }
}
