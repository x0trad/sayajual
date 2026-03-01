import { NextResponse } from 'next/server';
import { hasDatabaseConfig } from '@/lib/db';
import {
  createSession,
  findOrCreateUser,
  getSessionCookieName,
  isValidEmail,
} from '@/lib/auth';

export async function POST(request) {
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      { error: 'Database not configured. Set DATABASE_URL in environment variables.' },
      { status: 500 }
    );
  }

  try {
    const payload = await request.json();
    const email = String(payload?.email || '').trim().toLowerCase();
    const name = String(payload?.name || '').trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const user = await findOrCreateUser({ email, name });
    const session = await createSession(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.display_name,
      },
    });

    response.cookies.set(getSessionCookieName(), session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 });
  }
}
