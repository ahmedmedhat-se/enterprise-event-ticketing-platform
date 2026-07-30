import { Search, Armchair, CreditCard, QrCode } from 'lucide-react';

const steps = [
  {
    n: '01',
    title: 'Browse events',
    body: 'Find concerts, theatre, sports, and festivals near you. Every listing shows pricing tiers, capacity, and seat availability.',
    icon: Search,
  },
  {
    n: '02',
    title: 'Pick your seat',
    body: 'Open the live seat map and choose. The seat is held for you the instant you click — no one else can grab it while you decide.',
    icon: Armchair,
  },
  {
    n: '03',
    title: 'Checkout',
    body: 'You have ten minutes to complete payment. Apply early-bird pricing, review your order, and confirm. Secure, card-based checkout.',
    icon: CreditCard,
  },
  {
    n: '04',
    title: 'Get your ticket',
    body: 'A signed QR ticket lands in your account and inbox. Show it at the door — it’s verified on scan, no forgery possible.',
    icon: QrCode,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-20 lg:py-28">
      <div className="container-edge">
        <div className="max-w-xl">
          <p className="text-[13px] font-medium uppercase tracking-wide text-lav-700">How it works</p>
          <h2 className="mt-3 text-balance text-4xl font-medium text-ink-950 lg:text-5xl">
            From browse to door in four steps
          </h2>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 bg-white text-lav-700">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-5 font-mono text-[13px] text-ink-400">{s.n}</p>
              <h3 className="mt-1 text-lg font-medium text-ink-950">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}