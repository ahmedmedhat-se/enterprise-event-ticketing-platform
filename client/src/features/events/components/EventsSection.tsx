import { ArrowRight } from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import { EventCard } from './EventCard';
import { Spinner } from '../../../shared/ui/Spinner';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { EmptyState } from '../../../shared/ui/EmptyState';

export function EventsSection() {
  const { data, isLoading, error, refetch } = useEvents({ limit: 8 });
  const events = data?.data ?? [];

  return (
    <section id="events" className="border-t border-ink-200 py-20 lg:py-28">
      <div className="container-edge">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-[13px] font-medium uppercase tracking-wide text-lav-700">Live events</p>
            <h2 className="mt-3 text-balance text-4xl font-medium text-ink-950 lg:text-5xl">
              On sale now
            </h2>
            <p className="mt-4 text-pretty text-lg text-ink-600">
              Reserved seating and general admission — every seat selection is
              atomic, so no two fans ever book the same one.
            </p>
          </div>
          <a
            href="#"
            className="inline-flex w-fit items-center gap-1.5 text-[15px] font-medium text-ink-800 transition-colors hover:text-lav-700"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-12">
          {isLoading ? (
            <Spinner label="Loading events" />
          ) : error ? (
            <ErrorState message={error.message} onRetry={refetch} />
          ) : events.length === 0 ? (
            <EmptyState title="No events yet" message="Check back soon — new events are added regularly." />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}