import { useEffect, useState } from 'react';
import { Menu, X, Search, ArrowRight } from 'lucide-react';

const navLinks = [
  { label: 'Browse', href: '#events' },
  { label: 'How it works', href: '#how' },
  { label: 'FAQ', href: '#faq' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled ? 'border-ink-200 bg-paper/85 backdrop-blur-md' : 'border-transparent bg-paper'
      }`}
    >
      <nav className="container-edge flex h-16 items-center gap-6" aria-label="Primary">
        <a href="#top" className="shrink-0" aria-label="EETP home">
          <span className="inline-flex items-center gap-2.5">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-[0.55rem] bg-ink-950 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M13 2 4 13h6l-1 9 10-12h-7l1-8z" fill="currentColor" opacity="0.95" />
              </svg>
            </span>
            <span className="font-display text-[17px] font-medium tracking-tight text-ink-950">EETP</span>
          </span>
        </a>

        <ul className="hidden items-center gap-6 lg:flex">
          {navLinks.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="text-[15px] text-ink-600 transition-colors hover:text-ink-950">{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <label className="relative hidden sm:block">
            <span className="sr-only">Search events</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              placeholder="Search events, cities…"
              className="w-56 rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-[14px] text-ink-800 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
            />
          </label>
          <a href="#" className="rounded-lg px-3.5 py-2 text-[15px] text-ink-700 transition-colors hover:text-ink-950">Sign in</a>
          <a href="#events" className="inline-flex items-center gap-1.5 rounded-lg bg-ink-950 px-4 py-2 text-[15px] font-medium text-white transition-transform hover:-translate-y-px">
            Get tickets
            <ArrowRight className="h-4 w-4" />
          </a>
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
            {navLinks.map((l) => (
              <li key={l.label}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 text-lg text-ink-800">{l.label}</a>
              </li>
            ))}
            <li className="mt-2 flex gap-2 border-t border-ink-200 pt-3">
              <a href="#" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-ink-200 px-4 py-2.5 text-center text-[15px] text-ink-800">Sign in</a>
              <a href="#events" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-ink-950 px-4 py-2.5 text-center text-[15px] font-medium text-white">Get tickets</a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}