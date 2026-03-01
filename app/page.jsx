'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/badge';

const SWIPE_ACTION_WIDTH = 152;

const INITIAL_ITEMS = [
  { name: 'Vintage Tee', price: 'RM35', status: 'AVAILABLE' },
  { name: 'Denim Jacket', price: 'RM80', status: 'SOLD' },
  { name: 'Canvas Tote', price: 'RM25', status: 'AVAILABLE' },
];

function buildItemId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStatus(status) {
  return String(status || '').toUpperCase() === 'SOLD' ? 'SOLD' : 'AVAILABLE';
}

function mapItem(item) {
  return {
    id: buildItemId(),
    name: String(item.name || '').trim(),
    price: String(item.price || '').trim(),
    status: normalizeStatus(item.status),
  };
}

export default function HomePage() {
  const [threadUrl, setThreadUrl] = useState('');
  const [items, setItems] = useState(() => INITIAL_ITEMS.map(mapItem));
  const [sourceUrl, setSourceUrl] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedLink, setPublishedLink] = useState('');
  const [swipeOffsets, setSwipeOffsets] = useState({});

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const activeSwipeRef = useRef({ id: null, startX: 0, startY: 0, baseOffset: 0 });

  const canPublish = useMemo(
    () => !isPublishing && items.length > 0 && Boolean(sourceUrl) && Boolean(user),
    [isPublishing, items.length, sourceUrl, user]
  );

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const payload = await response.json();

        if (!mounted) return;
        setUser(payload.user || null);
      } catch {
        if (!mounted) return;
        setUser(null);
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const closeAllSwipes = (exceptId = null) => {
    setSwipeOffsets((current) => {
      const next = { ...current };
      Object.keys(next).forEach((id) => {
        if (exceptId && id === exceptId) return;
        next[id] = 0;
      });
      return next;
    });
  };

  const onSwipeStart = (event, itemId) => {
    const touch = event.touches?.[0];
    if (!touch) return;

    closeAllSwipes(itemId);

    activeSwipeRef.current = {
      id: itemId,
      startX: touch.clientX,
      startY: touch.clientY,
      baseOffset: swipeOffsets[itemId] || 0,
    };
  };

  const onSwipeMove = (event, itemId) => {
    const touch = event.touches?.[0];
    if (!touch) return;

    const active = activeSwipeRef.current;
    if (active.id !== itemId) return;

    const deltaX = touch.clientX - active.startX;
    const deltaY = touch.clientY - active.startY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    event.preventDefault();

    const next = Math.min(0, Math.max(-SWIPE_ACTION_WIDTH, active.baseOffset + deltaX));
    setSwipeOffsets((current) => ({ ...current, [itemId]: next }));
  };

  const onSwipeEnd = (itemId) => {
    const offset = swipeOffsets[itemId] || 0;
    const shouldOpen = offset <= -SWIPE_ACTION_WIDTH * 0.45;

    setSwipeOffsets((current) => ({
      ...current,
      [itemId]: shouldOpen ? -SWIPE_ACTION_WIDTH : 0,
    }));

    activeSwipeRef.current = { id: null, startX: 0, startY: 0, baseOffset: 0 };
  };

  const handleParse = async (event) => {
    event.preventDefault();

    const nextThreadUrl = threadUrl.trim();
    if (!nextThreadUrl) {
      setFeedback('Please paste your Threads post link.');
      return;
    }

    setFeedback('Converting your post into item list...');
    setIsParsing(true);
    setPublishedLink('');

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadUrl: nextThreadUrl }),
      });

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const payload = isJson ? await response.json() : { error: await response.text() };

      if (!response.ok) {
        setFeedback(payload.error || `Unable to parse this post right now (${response.status}).`);
        setSourceUrl('');
        setItems([]);
        return;
      }

      const mapped = (payload.items || []).map(mapItem).filter((item) => item.name && item.price);
      setItems(mapped);
      setSourceUrl(payload.sourceUrl || nextThreadUrl);
      setSwipeOffsets({});

      if (payload.warnings?.length) {
        setFeedback(`Parsed with note: ${payload.warnings[0]}`);
      } else {
        setFeedback('Done. Swipe each row to edit or delete before publish.');
      }
    } catch {
      setFeedback('Network error. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) {
      setFeedback('Please enter your email to sign in.');
      return;
    }

    setLoginLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nextEmail, name: name.trim() }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setFeedback(payload.error || 'Unable to sign in right now.');
        return;
      }

      setUser(payload.user || null);
      setFeedback('Signed in. You can now publish listings.');
    } catch {
      setFeedback('Network error while signing in.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setFeedback('Signed out. Sign in again to publish.');
    } catch {
      setFeedback('Unable to sign out right now.');
    }
  };

  const handlePublish = async () => {
    if (!user) {
      setFeedback('Please sign in before publishing.');
      return;
    }

    if (!canPublish) {
      setFeedback('Convert a Threads post first before publishing.');
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch('/api/listings/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl,
          title: 'Threads Seller Listing',
          items,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setFeedback(payload.error || 'Could not publish listing right now.');
        return;
      }

      const fullUrl = `${window.location.origin}${payload.publicUrl}`;
      setPublishedLink(fullUrl);
      setFeedback('Published. Share this link in your Threads post.');
    } catch {
      setFeedback('Network error while publishing.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = (itemId) => {
    const ok = window.confirm('Delete this item from the list?');
    if (!ok) return;

    setItems((current) => current.filter((item) => item.id !== itemId));
    setSwipeOffsets((current) => ({ ...current, [itemId]: 0 }));
    setFeedback('Item deleted.');
  };

  const handleEdit = (itemId) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;

    const nextName = window.prompt('Item name', item.name);
    if (nextName === null) return;
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      setFeedback('Item name cannot be empty.');
      return;
    }

    const nextPrice = window.prompt('Price (example: RM35)', item.price);
    if (nextPrice === null) return;
    const trimmedPrice = nextPrice.trim();
    if (!trimmedPrice) {
      setFeedback('Price cannot be empty.');
      return;
    }

    const nextStatus = window.prompt('Status: AVAILABLE or SOLD', item.status);
    if (nextStatus === null) return;

    setItems((current) =>
      current.map((entry) =>
        entry.id === itemId
          ? {
              ...entry,
              name: trimmedName,
              price: trimmedPrice,
              status: normalizeStatus(nextStatus.trim()),
            }
          : entry
      )
    );

    setSwipeOffsets((current) => ({ ...current, [itemId]: 0 }));
    setFeedback('Item updated.');
  };

  const copyLink = async () => {
    if (!publishedLink) return;

    try {
      await navigator.clipboard.writeText(publishedLink);
      setFeedback('Link copied.');
    } catch {
      setFeedback('Unable to copy automatically. Long-press and copy the link.');
    }
  };

  return (
    <main className="mx-auto w-full max-w-[430px] px-4 pb-7 pt-5" onClick={() => closeAllSwipes()}>
      <Card className="p-4">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
          For Threads Sellers
        </p>
        <h1 className="mb-3 mt-2 text-[24px] font-extrabold leading-[1.2] text-foreground">
          Turn your Threads post into a simple selling page
        </h1>
        <p className="m-0 text-[15px] leading-relaxed text-muted">
          Paste your Threads post link and we convert it into an item list with price and
          availability.
        </p>

        <form className="mt-4 grid gap-3" onSubmit={handleParse}>
          <Input
            type="url"
            value={threadUrl}
            onChange={(event) => setThreadUrl(event.target.value)}
            placeholder="https://www.threads.net/@username/post/..."
          />
          <Button size="lg" type="submit" disabled={isParsing}>
            {isParsing ? 'Converting...' : 'Turn Into List'}
          </Button>
        </form>

        <div className="mt-4 rounded-xl border border-border bg-white p-3">
          {authLoading ? (
            <p className="m-0 text-sm text-muted">Checking sign-in status...</p>
          ) : user ? (
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="m-0 text-sm font-bold text-foreground">Signed in as</p>
                <p className="m-0 text-sm text-muted">{user.email}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          ) : (
            <form className="grid gap-2" onSubmit={handleLogin}>
              <p className="m-0 text-sm font-bold text-foreground">Sign in to publish listings</p>
              <Input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name (optional)"
              />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@email.com"
              />
              <Button size="sm" disabled={loginLoading}>
                {loginLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          )}
        </div>

        <p className="mb-0 mt-3 min-h-5 text-xs text-muted" role="status" aria-live="polite">
          {feedback}
        </p>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-border px-4 py-4">
          <h2 className="m-0 text-2xl font-extrabold text-foreground">Preview</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Auto extracted from your post. You can edit before publish.
          </p>
        </div>

        <ul className="m-0 p-0">
          {items.map((item) => {
            const offset = swipeOffsets[item.id] || 0;
            return (
              <li key={item.id} className="swipe-row list-none border-t border-border first:border-t-0">
                <div className="swipe-actions">
                  <Button
                    className="h-full rounded-none"
                    variant="warning"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEdit(item.id);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    className="h-full rounded-none"
                    variant="danger"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(item.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>

                <div
                  className="swipe-panel flex items-center justify-between gap-3 px-4 py-4"
                  style={{ transform: `translateX(${offset}px)` }}
                  onClick={(event) => event.stopPropagation()}
                  onTouchStart={(event) => onSwipeStart(event, item.id)}
                  onTouchMove={(event) => onSwipeMove(event, item.id)}
                  onTouchEnd={() => onSwipeEnd(item.id)}
                  onTouchCancel={() => onSwipeEnd(item.id)}
                >
                  <div className="min-w-0">
                    <p
                      className={`m-0 text-[16px] font-extrabold text-foreground ${
                        item.status === 'SOLD' ? 'line-through text-slate-500' : ''
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="mt-1 text-lg text-muted">{item.price}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <section className="mt-4">
        <Button className="w-full" size="lg" disabled={!canPublish} onClick={handlePublish}>
          {isPublishing ? 'Publishing...' : 'Publish This Page'}
        </Button>
        <p className="mb-0 mt-2 text-center text-xs text-muted">
          Sign in is required before publishing.
        </p>

        {publishedLink ? (
          <Card className="mt-2 p-3">
            <p className="m-0 text-[0.65rem] font-extrabold uppercase tracking-[0.07em] text-muted">
              Share Link
            </p>
            <a className="mt-1 block break-all text-sm text-foreground no-underline" href={publishedLink}>
              {publishedLink}
            </a>
            <Button className="mt-2 w-full" size="sm" variant="secondary" onClick={copyLink}>
              Copy Link
            </Button>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
