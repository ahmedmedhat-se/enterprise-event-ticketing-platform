import { LoaderCircle } from 'lucide-react';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-ink-500" role="status" aria-live="polite">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      <span className="text-[14px]">{label}…</span>
    </div>
  );
}