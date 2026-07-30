import { Calendar, MapPin, ArrowRight, Ticket } from 'lucide-react';
import type { Event } from '../../../shared/api/types';

const fmtPrice = (p: string) =>
  Number(p).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

// Deterministic calm gradient from the event name — used until the backend
// has an image column.
function hue(seed: string, shift: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const base = 255 + (h % 50) - 25 + shift * 18;
  return `linear-gradient(135deg, hsl(${base} 38% ${94 - shift * 4}%), hsl(${base + 12} 42% ${88 - shift * 6}%))`;
}

export function EventCard({ event }: { event: Event }) {
  const prices = event.pricingTiers.map((t) => Number(t.earlyBirdPrice ?? t.price));
  const from = Math.min(...prices);
  const hasEarly = event.pricingTiers.some((t) => t.earlyBirdPrice && Number(t.earlyBirdPrice) < Number(t.price));
  const capacity = event.totalSeats ?? event.totalCapacity ?? 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-[0_24px_48px_-28px_rgba(20,18,28,0.25)]">
      <div className="relative h-36 overflow-hidden" aria-hidden="true" style={{ background: hue(event.name, 0) }}>
        <span className="absolute left-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-[12px] font-medium text-ink-800 backdrop-blur-sm">
          {event.eventType === 'seated' ? 'Reserved seating' : 'General admission'}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-ink-950/70 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-sm">
          {capacity.toLocaleString()} seats
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3 text-[13px] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {fmtDate(event.date)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{fmtTime(event.date)}</span>
        </div>

        <h3 className="mt-2 text-pretty text-xl font-medium leading-snug text-ink-950">{event.name}</h3>

        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-ink-500">
          <MapPin className="h-3.5 w-3.5" />
          {event.city ?? 'TBA'}, {event.country ?? ''}
        </p>

        {event.description && (
          <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-ink-600">{event.description}</p>
        )}

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {event.pricingTiers.slice(0, 3).map((t) => (
            <li key={t.id} className="rounded-md border border-ink-200 bg-ink-50 px-2 py-1 text-[12px] text-ink-700">
              {t.tierName} · {fmtPrice(t.price)}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-end justify-between border-t border-ink-100 pt-4">
          <div>
            <p className="text-[12px] text-ink-400">{hasEarly ? 'Early bird from' : 'From'}</p>
            <p className="font-display text-2xl text-ink-950">{fmtPrice(String(from))}</p>
          </div>
          <a
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink-950 px-3.5 py-2 text-[14px] font-medium text-white transition-transform group-hover:-translate-y-0.5"
          >
            <Ticket className="h-3.5 w-3.5" />
            Get tickets
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}