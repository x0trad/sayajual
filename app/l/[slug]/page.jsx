import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { getListingBySlug } from '@/lib/listings';
import { hasDatabaseConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ListingPage({ params }) {
  if (!hasDatabaseConfig()) {
    notFound();
  }

  const listing = await getListingBySlug(params.slug);

  if (!listing) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-[430px] px-4 py-5">
      <Card className="p-4">
        <h1 className="text-2xl font-extrabold text-foreground">{listing.title}</h1>
        <p className="mt-2 break-all text-xs text-muted">
          Source:{' '}
          <Link className="underline" href={listing.sourceUrl} target="_blank">
            {listing.sourceUrl}
          </Link>
        </p>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <ul className="m-0 p-0">
          {listing.items.map((item) => (
            <li
              key={`${listing.id}-${item.name}-${item.price}`}
              className="flex items-center justify-between gap-3 border-t border-border px-4 py-4 first:border-t-0"
            >
              <div className="min-w-0">
                <p
                  className={`m-0 truncate text-[16px] font-extrabold text-foreground ${
                    item.status === 'SOLD' ? 'text-slate-500 line-through' : ''
                  }`}
                >
                  {item.name}
                </p>
                <p className="mt-1 text-lg text-muted">{item.price}</p>
              </div>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
