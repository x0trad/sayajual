import { cn } from '@/lib/utils';

export function StatusBadge({ status }) {
  const sold = status === 'SOLD';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold tracking-wide',
        sold ? 'bg-[#fbe8ee] text-sold' : 'bg-[#dcfaea] text-[#0c6e42]'
      )}
    >
      <span className={cn('h-2.5 w-2.5 rounded-full', sold ? 'bg-sold' : 'bg-available')} />
      {sold ? 'SOLD' : 'AVAILABLE'}
    </span>
  );
}
