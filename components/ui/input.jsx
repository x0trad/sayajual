import { cn } from '@/lib/utils';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-12 w-full rounded-xl border border-border bg-white px-4 py-3 text-base text-foreground placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bdd1ff]',
        className
      )}
      {...props}
    />
  );
}
