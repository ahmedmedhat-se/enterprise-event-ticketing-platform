import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Search, ArrowRight, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useLogout } from '../../hooks/useAuth';

const navLinks = [
  { label: 'Browse', href: '#events' },
  { label: 'How it works', href: '#how' },
  { label: 'FAQ', href: '#faq' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const logout = useLogout();

  const visibleLinks = isAuthenticated
    ? navLinks.filter((l) => l.label === 'Browse')
    : navLinks;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const dashboardLink = user?.role === 'organizer' ? '/organizer/dashboard' : '/dashboard';

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled ? 'border-ink-200 bg-paper/85 backdrop-blur-md' : 'border-transparent bg-paper'
      }`}
    >
      <nav className="container-edge flex h-16 items-center gap-6" aria-label="Primary">
        <Link to="/" className="shrink-0" aria-label="EETP home">
          <span className="inline-flex items-center gap-2.5">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-[0.55rem] bg-ink-950 text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                <path d="M9 7v10" />
                <path d="M15 7v10" />
                <circle cx="4" cy="12" r="0.5" fill="currentColor" stroke="none" />
                <circle cx="20" cy="12" r="0.5" fill="currentColor" stroke="none" />
                <path d="M6 12h3" opacity="0.4" />
                <path d="M15 12h3" opacity="0.4" />
              </svg>
            </span>
            <span className="font-display text-[17px] font-medium tracking-tight text-ink-950">EETP</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-6 lg:flex">
          {visibleLinks.map((l) => (
            <li key={l.label}>
              <Link to={l.href} className="text-[15px] text-ink-600 transition-colors hover:text-ink-950">{l.label}</Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {!isAuthenticated && (
            <label className="relative hidden sm:block">
              <span className="sr-only">Search events</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="search"
                placeholder="Search events, cities…"
                className="w-56 rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-[14px] text-ink-800 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
              />
            </label>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to={dashboardLink}
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[14px] text-ink-700 transition-colors hover:text-ink-950"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <span className="text-[14px] text-ink-400">{user?.name}</span>
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-[13px] text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-950"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3.5 py-2 text-[15px] text-ink-700 transition-colors hover:text-ink-950">Sign in</Link>
              <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-lg bg-ink-950 px-4 py-2 text-[15px] font-medium text-white transition-transform hover:-translate-y-px">
                Get tickets
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="ml-auto grid h-10 w-10 place-items-center rounded-lg text-ink-800 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-ink-200 bg-paper md:hidden">
          <ul className="container-edge flex flex-col py-3">
            {visibleLinks.map((l) => (
              <li key={l.label}>
                <Link to={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 text-lg text-ink-800">{l.label}</Link>
              </li>
            ))}
            <li className="mt-2 flex gap-2 border-t border-ink-200 pt-3">
              {isAuthenticated ? (
                <>
                  <Link to={dashboardLink} onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-ink-200 px-4 py-2.5 text-center text-[15px] text-ink-800">Dashboard</Link>
                  <button type="button" onClick={() => { logout.mutate(); setOpen(false); }} className="flex-1 rounded-lg border border-ink-200 px-4 py-2.5 text-center text-[15px] text-ink-800">Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-ink-200 px-4 py-2.5 text-center text-[15px] text-ink-800">Sign in</Link>
                  <Link to="/signup" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-ink-950 px-4 py-2.5 text-center text-[15px] font-medium text-white">Get tickets</Link>
                </>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
