import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Event, Seat, SeatLayoutRow } from '../../../shared/api/types';
import { SeatMap } from './SeatMap';

// ── Fake event for the Hero seat-map demo ─────────────────────────
const FAKE_COLS = 12;

function generateFakeSeats() {
  const tiers = [
    { name: 'Stalls', price: '85.00', rows: ['A', 'B', 'C'] },
    { name: 'Balcony', price: '55.00', rows: ['D', 'E'] },
    { name: 'Premium', price: '120.00', rows: ['F', 'G'] },
  ];

  const seats: Seat[] = [];
  const layout: SeatLayoutRow[] = [];

  for (const tier of tiers) {
    for (const row of tier.rows) {
      layout.push({
        row,
        seats: FAKE_COLS,
        name: tier.name,
        price: tier.price,
      });
      for (let n = 1; n <= FAKE_COLS; n++) {
        seats.push({
          id: `fake-${row}${n}`,
          row,
          number: n,
          tierId: tier.name,
          status: 'available',
        });
      }
    }
  }

  return { seats, layout };
}

const { seats: fakeSeats, layout: fakeLayout } = generateFakeSeats();

// Pre-seed a few booked seats so the grid doesn't start empty.
const SEED_BOOKED = ['A1', 'A2', 'B5', 'C9', 'E3', 'F11'];
const fakeSeatStatus: Record<string, 'held' | 'booked'> = {};
for (const ref of SEED_BOOKED) {
  const seat = fakeSeats.find((s) => `${s.row}${s.number}` === ref);
  if (seat) {
    seat.status = 'booked';
    fakeSeatStatus[seat.id] = 'booked';
  }
}

const fakeEvent: Event = {
  id: 'hero-demo',
  organizerId: '',
  name: 'Grand Theatre — Live Demo',
  description: null,
  city: 'Demo City',
  country: 'Demo',
  eventType: 'seated',
  salesStartAt: new Date().toISOString(),
  salesEndAt: null,
  totalSeats: fakeSeats.length,
  totalCapacity: null,
  date: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  pricingTiers: [
    { id: 't1', eventId: 'hero-demo', tierName: 'Stalls', price: '85.00', seatsCount: 36, earlyBirdPrice: null, earlyBirdExpiration: null, maxPerOrder: 6 },
    { id: 't2', eventId: 'hero-demo', tierName: 'Balcony', price: '55.00', seatsCount: 24, earlyBirdPrice: null, earlyBirdExpiration: null, maxPerOrder: 6 },
    { id: 't3', eventId: 'hero-demo', tierName: 'Premium', price: '120.00', seatsCount: 24, earlyBirdPrice: null, earlyBirdExpiration: null, maxPerOrder: 4 },
  ],
  seatLayout: fakeLayout,
  seats: fakeSeats,
  seatStatus: fakeSeatStatus,
};

// ── Component ─────────────────────────────────────────────────────
export function Hero() {
  const [live, setLive] = useState<{ held: Set<string>; booked: Set<string> }>({
    held: new Set(),
    booked: new Set(),
  });
  const liveRef = useRef(live);
  const [viewers, setViewers] = useState(1024);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);

  // Keep liveRef current without triggering re-renders.
  useEffect(() => { liveRef.current = live; }, [live]);

  // Simulate live seat activity on the fake seat map.
  useEffect(() => {
    const seats = fakeEvent.seats ?? [];
    let t1: ReturnType<typeof setTimeout>;
    const tick = () => {
      const liveSnapshot = liveRef.current;
      const available = seats.filter(
        (s) => s.status !== 'booked' && !liveSnapshot.held.has(s.id) && !liveSnapshot.booked.has(s.id),
      );
      if (available.length === 0) {
        t1 = setTimeout(tick, 3000);
        return;
      }

      const pick = available[Math.floor(Math.random() * available.length)];
      const ref = `${pick.row}${pick.number}`;

      setLive((prev) => {
        const held = new Set(prev.held);
        const booked = new Set(prev.booked);
        if (booked.has(pick.id)) return prev;
        held.add(pick.id);
        setActiveLabel(ref);
        setActiveSeatId(pick.id);
        return { held, booked };
      });

      t1 = setTimeout(() => {
        setLive((prev) => {
          const held = new Set(prev.held);
          const booked = new Set(prev.booked);
          held.delete(pick.id);
          booked.add(pick.id);
          return { held, booked };
        });
        setActiveLabel(null);
        setActiveSeatId(null);
        setTimeout(tick, 600 + Math.random() * 500);
      }, 520);
    };

    t1 = setTimeout(tick, 900);
    return () => clearTimeout(t1);
  }, []);

  // Animate the viewer counter.
  useEffect(() => {
    const id = setInterval(
      () => setViewers((v) => Math.max(980, v + Math.floor(Math.random() * 41 - 18))),
      2500,
    );
    return () => clearInterval(id);
  }, []);

  const totalSeats = fakeSeats.length;
  const soldCount = fakeSeats.filter((s) => {
    if (live.booked.has(s.id)) return true;
    if (live.held.has(s.id)) return true;
    return s.status === 'booked';
  }).length;
  const leftPct = totalSeats > 0 ? Math.round(((totalSeats - soldCount) / totalSeats) * 100) : 0;

  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(1100px 520px at 78% -8%, var(--color-lav-100), transparent 60%), radial-gradient(900px 480px at 8% 110%, var(--color-paper-2), transparent 55%)',
        }}
      />

      <div className="container-edge grid grid-cols-1 items-center gap-14 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:py-24">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/70 px-3 py-1 text-[13px] font-medium text-ink-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lav-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lav-600" />
            </span>
            Seats update live
          </span>

          <h1 className="mt-6 text-balance text-5xl font-medium leading-[1.04] tracking-tight text-ink-950 sm:text-6xl lg:text-[68px]">
            Find your seat.<br />
            <span className="font-display italic text-lav-700">Hold it instantly.</span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-600">
            Browse live events, watch the seat map update in real time as other
            fans select, and hold your seat the moment you click — no one else
            can take it for ten minutes while you check out.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#events"
              className="inline-flex items-center gap-2 rounded-xl bg-ink-950 px-5 py-3 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
            >
              Browse events
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-5 py-3 text-[15px] font-medium text-ink-800 transition-colors hover:border-ink-300"
            >
              How it works
            </a>
          </div>
        </div>

        <div className="animate-rise-2">
          <div className="rounded-2xl border border-ink-200 bg-white/80 p-4 shadow-[0_24px_48px_-24px_rgba(20,18,28,0.18)] backdrop-blur-sm sm:p-6">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div>
                <p className="font-display text-[15px] font-medium text-ink-950">
                  {fakeEvent.name}
                </p>
                <p className="mt-0.5 text-[13px] text-ink-500">
                  Live · {viewers.toLocaleString()} viewing
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lav-50 px-2.5 py-1 text-[12px] font-medium text-lav-700">
                On sale
              </span>
            </div>

            <div className="mt-4">
              <SeatMap
                event={fakeEvent}
                live={live}
                highlightedId={activeSeatId}
              />

              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-[12px] text-ink-500">
                  <span className="font-medium text-ink-800">{leftPct}%</span> left
                </span>
                <div className="h-6 overflow-hidden">
                  <div key={activeLabel ?? 'idle'} className={activeLabel ? 'animate-rise' : ''}>
                    {activeLabel ? (
                      <p className="font-mono text-[12px] text-ink-600">
                        <span className="text-lav-700">▶</span> {activeLabel} held
                      </p>
                    ) : (
                      <p className="font-mono text-[12px] text-ink-400">
                        idle · awaiting next selection…
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
