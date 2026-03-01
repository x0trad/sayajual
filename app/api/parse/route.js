import { NextResponse } from 'next/server';
import { isValidThreadsUrl, parseThreadsPost } from '@/lib/parser';

export async function POST(request) {
  try {
    const payload = await request.json();
    const threadUrl = String(payload?.threadUrl || '').trim();

    if (!threadUrl) {
      return NextResponse.json({ error: 'Thread URL is required.' }, { status: 400 });
    }

    if (!isValidThreadsUrl(threadUrl)) {
      return NextResponse.json({ error: 'Please use a valid Threads post URL.' }, { status: 400 });
    }

    const result = await parseThreadsPost(threadUrl);

    return NextResponse.json({
      sourceUrl: threadUrl,
      items: result.items,
      warnings: result.warnings,
      usedSample: result.usedSample,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
}
