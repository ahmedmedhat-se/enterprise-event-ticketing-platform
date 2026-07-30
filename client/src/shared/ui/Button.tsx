import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-ink-950 text-white hover:-translate-y-0.5',
  secondary: 'border border-ink-200 bg-white text-ink-800 hover:border-ink-300',
  ghost: 'text-ink-700 hover:text-ink-950',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[14px]',
  md: 'px-4 py-2.5 text-[15px]',
  lg: 'px-5 py-3 text-[15px]',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-transform disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}