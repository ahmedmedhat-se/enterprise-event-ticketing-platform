import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container-edge flex flex-col items-center justify-center py-32 text-center">
      <p className="font-mono text-[13px] text-ink-400">404</p>
      <h1 className="mt-2 text-4xl font-medium text-ink-950">Page not found</h1>
      <p className="mt-3 text-[15px] text-ink-600">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-ink-950 px-5 py-3 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
      >
        Back to home
      </Link>
    </div>
  );
}