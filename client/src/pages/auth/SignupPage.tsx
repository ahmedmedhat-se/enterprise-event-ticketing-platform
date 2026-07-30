import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup } from '../../hooks/useAuth';

export function SignupPage() {
  const navigate = useNavigate();
  const signup = useSignup('fan');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signup.mutate(
      { name, email, password, phone: phone || undefined },
      { onSuccess: () => navigate('/dashboard') },
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-ink-200 bg-white p-8">
          <h1 className="text-2xl font-medium text-ink-950">Create account</h1>
          <p className="mt-1 text-[14px] text-ink-500">Start booking live events</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="name" className="text-[13px] font-medium text-ink-700">Name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="text-[13px] font-medium text-ink-700">Email</label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="text-[13px] font-medium text-ink-700">Phone (optional)</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="+1 555 123 4567"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="text-[13px] font-medium text-ink-700">Password</label>
              <input
                id="signup-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={signup.isPending}
              className="w-full rounded-xl bg-ink-950 px-5 py-3 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signup.isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-[14px] text-ink-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-lav-700 hover:text-lav-600">Sign in</Link>
          </p>

          <div className="mt-4 border-t border-ink-100 pt-4 text-center">
            <Link to="/organizer/signup" className="text-[13px] text-ink-400 hover:text-ink-700">
              Register as an organizer instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
