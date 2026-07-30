import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import apiClient from '../../shared/api/client';

interface Booking {
  id: string;
  eventId: string;
  event?: { name: string; date: string; city: string; country: string };
  status: string;
  grandTotal: string;
  createdAt: string;
}

export function FanDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/bookings')
      .then((res) => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-edge py-10 lg:py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-ink-950">My dashboard</h1>
          <p className="mt-1 text-[15px] text-ink-500">Welcome back, {user?.name}</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-ink-950 px-4 py-2.5 text-[14px] font-medium text-white transition-transform hover:-translate-y-0.5"
        >
          Browse events
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-medium text-ink-950">My bookings</h2>

        {loading ? (
          <p className="mt-6 text-[14px] text-ink-400">Loading bookings…</p>
        ) : bookings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-10 text-center">
            <Ticket className="mx-auto h-8 w-8 text-ink-300" />
            <h3 className="mt-3 text-[15px] font-medium text-ink-800">No bookings yet</h3>
            <p className="mt-1 text-[14px] text-ink-500">Find an event and book your first tickets.</p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-ink-950 px-4 py-2 text-[14px] font-medium text-white"
            >
              Browse events
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-2xl border border-ink-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-ink-950">{b.event?.name ?? 'Event'}</h3>
                    <div className="mt-1.5 flex items-center gap-3 text-[13px] text-ink-500">
                      {b.event?.date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(b.event.date).toLocaleDateString()}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <span className={`inline-block h-2 w-2 rounded-full ${
                          b.status === 'confirmed' ? 'bg-green-500' :
                          b.status === 'pending' ? 'bg-amber-400' :
                          'bg-ink-300'
                        }`} />
                        {b.status}
                      </span>
                    </div>
                  </div>
                  {b.grandTotal && (
                    <span className="text-[15px] font-medium text-ink-950">
                      ${Number(b.grandTotal).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
