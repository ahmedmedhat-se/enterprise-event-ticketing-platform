import { type ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: Props) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      {icon && <div className="text-ink-300">{icon}</div>}
      <h3 className="text-[15px] font-medium text-ink-800">{title}</h3>
      {message && <p className="text-[14px] text-ink-500">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}