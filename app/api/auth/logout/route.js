import { NextResponse } from 'next/server';
import { hasDatabaseConfig } from '@/lib/db';
import { deleteSession, getSessionCookieName } from '@/lib/auth';

export async function POST(request) {
  if (!hasDatabaseConfig()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const token = request.cookies.get(getSessionCookieName())?.value;
    await deleteSession(token);
  } catch {
    // no-op
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  return response;
}
