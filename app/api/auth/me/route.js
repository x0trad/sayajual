import { NextResponse } from 'next/server';
import { hasDatabaseConfig } from '@/lib/db';
import { getSessionCookieName, getUserBySessionToken } from '@/lib/auth';

export async function GET(request) {
  if (!hasDatabaseConfig()) {
    return NextResponse.json({ user: null });
  }

  try {
    const token = request.cookies.get(getSessionCookieName())?.value;
    const user = await getUserBySessionToken(token);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.display_name,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
