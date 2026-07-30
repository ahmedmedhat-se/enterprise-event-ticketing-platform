import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';

export function OrganizerLoginPage() {
  const navigate = useNavigate();
  const login = useLogin('organizer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => navigate('/organizer/dashboard') },
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-ink-200 bg-white p-8">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-lav-50 px-2.5 py-1 text-[12px] font-medium text-lav-700">
            Organizer
          </div>
          <h1 className="text-2xl font-medium text-ink-950">Organizer sign in</h1>
          <p className="mt-1 text-[14px] text-ink-500">Manage your events and sales</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="org-email" className="text-[13px] font-medium text-ink-700">Email</label>
              <input
                id="org-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="organizer@example.com"
              />
            </div>

            <div>
              <label htmlFor="org-password" className="text-[13px] font-medium text-ink-700">Password</label>
              <input
                id="org-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="Your password"
              />
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full rounded-xl bg-lav-700 px-5 py-3 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-[14px] text-ink-500">
            Don't have an organizer account?{' '}
            <Link to="/organizer/signup" className="font-medium text-lav-700 hover:text-lav-600">Register</Link>
          </div>

          <div className="mt-4 border-t border-ink-100 pt-4 text-center">
            <Link to="/login" className="text-[13px] text-ink-400 hover:text-ink-700">
              Looking for fan tickets? Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
