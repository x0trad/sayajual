import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        default: 'bg-[#111727] text-white hover:bg-[#0c1323]',
        secondary: 'bg-white border border-border text-foreground hover:bg-slate-50',
        warning: 'bg-[#f3cc69] text-[#5e4100] hover:bg-[#e9c25e]',
        danger: 'bg-[#df667a] text-white hover:bg-[#d2596f]',
      },
      size: {
        default: 'h-12 px-4 py-2 text-base',
        sm: 'h-10 px-3 text-sm',
        lg: 'h-12 px-5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
