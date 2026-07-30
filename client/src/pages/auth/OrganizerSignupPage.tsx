import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup } from '../../hooks/useAuth';

export function OrganizerSignupPage() {
  const navigate = useNavigate();
  const signup = useSignup('organizer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signup.mutate(
      { name, email, password, businessName, businessRegistrationNumber, taxId },
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
          <h1 className="text-2xl font-medium text-ink-950">Register as organizer</h1>
          <p className="mt-1 text-[14px] text-ink-500">Start selling tickets for your events</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="org-name" className="text-[13px] font-medium text-ink-700">Your name</label>
              <input
                id="org-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="org-signup-email" className="text-[13px] font-medium text-ink-700">Email</label>
              <input
                id="org-signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="organizer@example.com"
              />
            </div>

            <div>
              <label htmlFor="org-business" className="text-[13px] font-medium text-ink-700">Business name</label>
              <input
                id="org-business"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="My Event Co."
              />
            </div>

            <div>
              <label htmlFor="org-reg" className="text-[13px] font-medium text-ink-700">Business registration number</label>
              <input
                id="org-reg"
                type="text"
                required
                value={businessRegistrationNumber}
                onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="BRN-12345"
              />
            </div>

            <div>
              <label htmlFor="org-tax" className="text-[13px] font-medium text-ink-700">Tax ID</label>
              <input
                id="org-tax"
                type="text"
                required
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-lav-400 focus:outline-none"
                placeholder="TX-98765"
              />
            </div>

            <div>
              <label htmlFor="org-signup-password" className="text-[13px] font-medium text-ink-700">Password</label>
              <input
                id="org-signup-password"
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
              className="w-full rounded-xl bg-lav-700 px-5 py-3 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signup.isPending ? 'Registering…' : 'Register as organizer'}
            </button>
          </form>

          <p className="mt-6 text-center text-[14px] text-ink-500">
            Already have an account?{' '}
            <Link to="/organizer/login" className="font-medium text-lav-700 hover:text-lav-600">Sign in</Link>
          </p>

          <div className="mt-4 border-t border-ink-100 pt-4 text-center">
            <Link to="/signup" className="text-[13px] text-ink-400 hover:text-ink-700">
              Looking for fan tickets? Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
