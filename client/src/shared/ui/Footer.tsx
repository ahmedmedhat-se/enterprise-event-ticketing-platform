const columns = [
  { title: 'Explore', links: ['Browse events', 'How it works', 'FAQ'] },
  { title: 'Account', links: ['Sign in', 'Create account', 'My bookings', 'My tickets'] },
  { title: 'Organize', links: ['Become an organizer', 'Create event', 'Door check-in', 'Sales dashboard'] },
  { title: 'Support', links: ['Help center', 'Contact', 'Refund policy', 'Terms'] },
];

export function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-ink-950 text-ink-300">
      <div className="container-edge py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5 lg:gap-16">
          <div className="col-span-2 md:col-span-1">
            <span className="inline-flex items-center gap-2.5">
              <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-[0.55rem] bg-white text-ink-950">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2 4 13h6l-1 9 10-12h-7l1-8z" fill="currentColor" opacity="0.95" /></svg>
              </span>
              <span className="font-display text-[17px] font-medium tracking-tight text-white">EETP</span>
            </span>
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ink-400">Find live events, hold your seat instantly, and get a ticket you can trust at the door.</p>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-[13px] font-medium uppercase tracking-wide text-ink-400">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="text-[14px] text-ink-300 transition-colors hover:text-white">{l}</a></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 border-t border-ink-800 pt-8">
          <p className="text-[13px] text-ink-500">© 2026 EETP. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}