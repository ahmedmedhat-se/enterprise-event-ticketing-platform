import { useMemo } from 'react';
import { SeatIcon } from './SeatIcon';
import type { Event, SeatStatus } from '../../../shared/api/types';

interface Props {
  event: Event;
  /**
   * Live overlay — seat UUIDs currently held/booked by other users,
   * received from the Socket.IO `seatStatusUpdate` broadcast.
   */
  live?: { held: Set<string>; booked: Set<string> };
  /** Optional: highlight a specific seat (e.g. user's hold) by UUID */
  highlightedId?: string | null;
}

/**
 * Render a venue seat map from the event's `seats` array (which contains
 * individual seat UUIDs). Mobile-safe: uses overflow-x-auto on the outer
 * wrapper so the grid never overflows the viewport.
 *
 * Status resolution order (highest priority first):
 * 1. `live` overlay (from Socket.IO — real-time)
 * 2. `seatStatus` from the event detail response
 * 3. The seat's own DB status
 */
export function SeatMap({ event, live, highlightedId }: Props) {
  const { seatLayout, seats, seatStatus } = event;

  // Build a lookup: seat ref "A3" → { id, status } using the priority chain.
  const seatMap = useMemo(() => {
    const map = new Map<string, { id: string; status: SeatStatus }>();
    if (!seats || seats.length === 0) return map;

    for (const s of seats) {
      const ref = `${s.row}${s.number}`;

      // Priority 1: live overlay (real-time WS)
      if (live) {
        if (live.booked.has(s.id)) {
          map.set(ref, { id: s.id, status: 'booked' });
          continue;
        }
        if (live.held.has(s.id)) {
          map.set(ref, { id: s.id, status: 'held' });
          continue;
        }
      }

      // Priority 2: seatStatus from API response
      if (seatStatus && seatStatus[s.id]) {
        map.set(ref, { id: s.id, status: seatStatus[s.id] as SeatStatus });
        continue;
      }

      // Priority 3: seat's own DB status
      map.set(ref, { id: s.id, status: s.status });
    }

    return map;
  }, [seats, seatStatus, live]);

  if (!seatLayout || seatLayout.length === 0) {
    return (
      <p className="py-8 text-center text-[14px] text-ink-500">
        No seat map available.
      </p>
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0">
      <div className="mx-auto w-fit min-w-[280px] sm:min-w-0">
        {/* Stage indicator */}
        <div className="mb-5 flex justify-center">
          <div className="h-1.5 w-3/5 rounded-full bg-ink-200" aria-hidden="true" />
        </div>
        <p className="mb-4 text-center text-[11px] uppercase tracking-[0.2em] text-ink-300">
          Stage
        </p>

        {/* Rows */}
        <div
          className="flex flex-col items-center gap-2.5"
          role="list"
          aria-label="Seat map"
        >
          {seatLayout.map((row) => {
            const rowSeats = (seats ?? [])
              .filter((s) => s.row === row.row)
              .sort((a, b) => a.number - b.number);

            return (
              <div key={row.row} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-right text-[11px] font-medium text-ink-400">
                  {row.row}
                </span>

                <div
                  className="flex flex-wrap justify-center gap-[3px] sm:gap-1.5"
                  style={{ maxWidth: 'min(90vw, 560px)' }}
                >
                  {rowSeats.map((s) => {
                    const ref = `${s.row}${s.number}`;
                    const entry = seatMap.get(ref);
                    const status = entry?.status ?? s.status;

                    return (
                      <SeatIcon
                        key={s.id}
                        seatId={s.id}
                        label={ref}
                        status={status}
                        active={highlightedId === s.id}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-ink-100 pt-4 text-[12px] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] border border-ink-200 bg-ink-50" />
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] border border-lav-400 bg-lav-200" />
            Held
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] border border-ink-700 bg-ink-800" />
            Booked
          </span>
        </div>
      </div>
    </div>
  );
}
