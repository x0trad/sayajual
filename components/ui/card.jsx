import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return (
    <section
      className={cn('rounded-xl2 border border-border bg-card shadow-card', className)}
      {...props}
    />
  );
}
