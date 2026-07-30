import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEvent } from '../features/events/hooks/useEvent';
import { useEventSocket } from '../features/events/hooks/useEventSocket';
import { SeatMap } from '../features/events/components/SeatMap';
import { Spinner } from '../shared/ui/Spinner';
import { ErrorState } from '../shared/ui/ErrorState';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading, error, refetch } = useEvent(id);

  // Connect to the live seat-update socket once we have the event id.
  // No access token yet (auth not wired into the frontend), so the socket
  // connects in read-only mode.
  const { heldSeats, bookedSeats, isConnected } = useEventSocket({
    eventId: id,
  });

  if (isLoading) return <Spinner label="Loading event" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!event) return <ErrorState message="Event not found" />;

  return (
    <div className="container-edge py-10 lg:py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-600 transition-colors hover:text-ink-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      <div className="mt-6 max-w-3xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-lav-50 px-2.5 py-1 text-[12px] font-medium text-lav-700">
          {event.eventType === 'seated' ? 'Reserved seating' : 'General admission'}
        </span>
        <h1 className="mt-4 text-balance text-4xl font-medium tracking-tight text-ink-950 lg:text-5xl">
          {event.name}
        </h1>
        <p className="mt-3 text-[15px] text-ink-500">
          {fmtDate(event.date)}
          {event.city ? ` · ${event.city}` : ''}
          {event.country ? `, ${event.country}` : ''}
        </p>
        {event.description && (
          <p className="mt-5 text-pretty text-lg leading-relaxed text-ink-600">
            {event.description}
          </p>
        )}
      </div>

      {event.eventType === 'seated' && (
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-medium text-ink-950">Choose your seat</h2>
            <span className="text-[12px] text-ink-400">
              {isConnected ? 'Live · updates on' : 'Connecting…'}
            </span>
          </div>
          <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-4 sm:p-6">
            <SeatMap
              event={event}
              live={{ held: heldSeats, booked: bookedSeats }}
            />
          </div>
        </section>
      )}

      {event.eventType === 'general_admission' && (
        <section className="mt-12">
          <h2 className="text-2xl font-medium text-ink-950">Tickets</h2>
          <p className="mt-3 text-[15px] text-ink-600">
            General admission — {event.totalCapacity ?? 0} capacity. Seat selection
            not required.
          </p>
        </section>
      )}
    </div>
  );
}