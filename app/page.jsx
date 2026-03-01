'use client';

import Link from 'next/link';
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
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
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

function formatDate(dateValue) {
  try {
    return new Date(dateValue).toLocaleDateString();
  } catch {
    return '';
  }
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const [myListings, setMyListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const [editingItemId, setEditingItemId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStatus, setEditStatus] = useState('AVAILABLE');

  const activeSwipeRef = useRef({ id: null, startX: 0, startY: 0, baseOffset: 0 });

  const canPublish = useMemo(
    () => !isPublishing && items.length > 0 && Boolean(sourceUrl) && Boolean(user),
    [isPublishing, items.length, sourceUrl, user]
  );
  const showDashboardOnly = Boolean(user) && !showComposer;

  const loadMyListings = async () => {
    if (!user) {
      setMyListings([]);
      return;
    }

    setListingsLoading(true);
    try {
      const response = await fetch('/api/listings/mine');
      const payload = await response.json();
      setMyListings(Array.isArray(payload.listings) ? payload.listings : []);
    } catch {
      setMyListings([]);
    } finally {
      setListingsLoading(false);
    }
  };

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
        if (mounted) setAuthLoading(false);
      }
    };

    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadMyListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user) {
      setShowComposer(false);
    }
  }, [user]);

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
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

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
        setFeedback('Done. Swipe row, tap Edit/Delete to manage items.');
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
      setAuthModalOpen(false);
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
      setMyListings([]);
      setShowComposer(false);
      setFeedback('Signed out. Sign in again to publish.');
    } catch {
      setFeedback('Unable to sign out right now.');
    }
  };

  const handlePublish = async () => {
    if (!user) {
      setFeedback('Please sign in before publishing.');
      setAuthMode('signin');
      setAuthModalOpen(true);
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
        body: JSON.stringify({ sourceUrl, title: 'Threads Seller Listing', items }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setFeedback(payload.error || 'Could not publish listing right now.');
        return;
      }

      const fullUrl = `${window.location.origin}${payload.publicUrl}`;
      setPublishedLink(fullUrl);
      setFeedback('Published. Share this link in your Threads post.');
      await loadMyListings();
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

  const openEditModal = (itemId) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;

    setEditingItemId(itemId);
    setEditName(item.name);
    setEditPrice(item.price);
    setEditStatus(item.status);
  };

  const saveEditModal = () => {
    if (!editingItemId) return;

    const trimmedName = editName.trim();
    const trimmedPrice = editPrice.trim();

    if (!trimmedName) {
      setFeedback('Item name cannot be empty.');
      return;
    }

    if (!trimmedPrice) {
      setFeedback('Price cannot be empty.');
      return;
    }

    setItems((current) =>
      current.map((entry) =>
        entry.id === editingItemId
          ? { ...entry, name: trimmedName, price: trimmedPrice, status: normalizeStatus(editStatus) }
          : entry
      )
    );

    setSwipeOffsets((current) => ({ ...current, [editingItemId]: 0 }));
    setEditingItemId(null);
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
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-7 pt-5" onClick={() => closeAllSwipes()}>
      <Card className="mb-4 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-lg font-extrabold text-foreground">Sayajual</p>
          <div className="flex items-center gap-2">
            {authLoading ? null : user ? (
              <>
                <p className="hidden text-xs text-muted md:block">{user.email}</p>
                <Button variant="secondary" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthModalOpen(true);
                  }}
                >
                  Sign in
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthModalOpen(true);
                  }}
                >
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className={showDashboardOnly ? 'grid gap-4' : 'grid gap-4 md:grid-cols-[280px_1fr]'}>
        <aside className={showDashboardOnly ? 'order-1' : 'order-2 md:order-1'}>
          {user ? (
            <Card className="p-4 md:sticky md:top-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-extrabold text-foreground">My Listings</h2>
                <Button size="sm" onClick={() => setShowComposer(true)}>
                  Create New
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted">Your created Threads listings</p>
              {showComposer ? (
                <Button className="mt-2 w-full" variant="secondary" size="sm" onClick={() => setShowComposer(false)}>
                  ← Back
                </Button>
              ) : null}

              <div className="mt-3 max-h-[55vh] space-y-2 overflow-auto pr-1">
                {listingsLoading ? (
                  <p className="m-0 text-sm text-muted">Loading sessions...</p>
                ) : myListings.length === 0 ? (
                  <p className="m-0 text-sm text-muted">No listing yet. Publish your first one.</p>
                ) : (
                  myListings.map((listing) => (
                    <Link
                      key={listing.id}
                      href={`/l/${listing.slug}`}
                      className="block rounded-xl border border-border bg-white p-3 no-underline"
                    >
                      <p className="m-0 truncate text-sm font-bold text-foreground">{listing.title}</p>
                      <p className="mt-1 truncate text-xs text-muted">/{listing.slug}</p>
                      <p className="mt-1 text-[11px] text-muted">{formatDate(listing.createdAt)}</p>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          ) : null}
        </aside>

        {!showDashboardOnly ? (
        <section className="order-1 md:order-2 space-y-4">
          {user ? (
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowComposer(false)}>
                Back to My Listings
              </Button>
            </div>
          ) : null}
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
                placeholder="https://www.threads.com/@username/post/..."
              />
              <Button size="lg" type="submit" disabled={isParsing}>
                {isParsing ? 'Converting...' : 'Turn Into List'}
              </Button>
            </form>

            <p className="mb-0 mt-3 min-h-5 text-xs text-muted" role="status" aria-live="polite">
              {feedback}
            </p>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-4">
              <h2 className="m-0 text-2xl font-extrabold text-foreground">Preview</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Auto extracted from your post. Swipe left on row, then tap Edit/Delete.
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
                          openEditModal(item.id);
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

          <section>
            <Button className="w-full" size="lg" disabled={!canPublish} onClick={handlePublish}>
              {isPublishing ? 'Publishing...' : 'Publish This Page'}
            </Button>
            <p className="mb-0 mt-2 text-center text-xs text-muted">Sign in is required before publishing.</p>

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
        </section>
        ) : null}
      </div>

      {editingItemId ? (
        <div className="fixed inset-0 z-50 bg-black/45 p-4" onClick={() => setEditingItemId(null)}>
          <div
            className="mx-auto mt-16 w-full max-w-[430px]"
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="p-4">
              <h3 className="m-0 text-lg font-extrabold text-foreground">Edit item</h3>
              <p className="mt-1 text-sm text-muted">Update name, price and availability status.</p>

              <div className="mt-3 grid gap-2">
                <Input value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Item name" />
                <Input value={editPrice} onChange={(event) => setEditPrice(event.target.value)} placeholder="RM35" />

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={editStatus === 'AVAILABLE' ? 'default' : 'secondary'}
                    onClick={() => setEditStatus('AVAILABLE')}
                  >
                    Available
                  </Button>
                  <Button
                    type="button"
                    variant={editStatus === 'SOLD' ? 'danger' : 'secondary'}
                    onClick={() => setEditStatus('SOLD')}
                  >
                    Sold
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditingItemId(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={saveEditModal}>
                  Save
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {authModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 p-4" onClick={() => setAuthModalOpen(false)}>
          <div className="mx-auto mt-16 w-full max-w-[430px]" onClick={(event) => event.stopPropagation()}>
            <Card className="p-4">
              <h3 className="m-0 text-lg font-extrabold text-foreground">
                {authMode === 'signup' ? 'Sign up' : 'Sign in'}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {authMode === 'signup'
                  ? 'Create your seller account to publish listings.'
                  : 'Sign in to publish listings.'}
              </p>

              <form className="mt-3 grid gap-2" onSubmit={handleLogin}>
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
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => setAuthModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loginLoading}>
                    {loginLoading ? 'Please wait...' : authMode === 'signup' ? 'Create Account' : 'Sign in'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      ) : null}
    </main>
  );
}
