import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Plus, Eye } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import apiClient from '../../shared/api/client';

interface Event {
  id: string;
  name: string;
  date: string;
  city: string;
  country: string;
  eventType: string;
  totalSeats: number | null;
  pricingTiers: { tierName: string; price: string }[];
  _count?: { bookings: number };
}

export function OrganizerDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/events/mine')
      .then((res) => setEvents(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeEvents = events.length;

  return (
    <div className="container-edge py-10 lg:py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-ink-950">Organizer dashboard</h1>
          <p className="mt-1 text-[15px] text-ink-500">{user?.name}</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-lav-700 px-4 py-2.5 text-[14px] font-medium text-white transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Create event
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-[13px] text-ink-400">Active events</p>
          <p className="mt-1 text-3xl font-medium text-ink-950">{activeEvents}</p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-[13px] text-ink-400">Total seats</p>
          <p className="mt-1 text-3xl font-medium text-ink-950">
            {events.reduce((sum, e) => sum + (e.totalSeats ?? 0), 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-[13px] text-ink-400">Tickets sold</p>
          <p className="mt-1 text-3xl font-medium text-ink-950">—</p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-medium text-ink-950">My events</h2>

        {loading ? (
          <p className="mt-6 text-[14px] text-ink-400">Loading events…</p>
        ) : events.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-10 text-center">
            <Calendar className="mx-auto h-8 w-8 text-ink-300" />
            <h3 className="mt-3 text-[15px] font-medium text-ink-800">No events yet</h3>
            <p className="mt-1 text-[14px] text-ink-500">Create your first event to start selling tickets.</p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-lav-700 px-4 py-2 text-[14px] font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Create event
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {events.map((e) => (
              <div key={e.id} className="rounded-2xl border border-ink-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-ink-950">{e.name}</h3>
                    <div className="mt-1.5 flex items-center gap-3 text-[13px] text-ink-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(e.date).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {e.city}, {e.country}
                      </span>
                      <span className="rounded-md bg-ink-50 px-2 py-0.5 text-[12px] text-ink-600">
                        {e.eventType === 'seated' ? 'Reserved seating' : 'General admission'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {e.pricingTiers?.map((t) => (
                        <span key={t.tierName} className="rounded-md border border-ink-200 px-2 py-0.5 text-[12px] text-ink-600">
                          {t.tierName} · ${Number(t.price).toFixed(0)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    to={`/events/${e.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-[13px] text-ink-600 transition-colors hover:border-ink-300"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
