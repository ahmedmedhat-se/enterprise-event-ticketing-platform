import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'What happens after I pick a seat?',
    a: 'The seat is instantly held for you for ten minutes. During that window no one else can select it. If you don’t complete checkout in time, the hold expires and the seat becomes available again.',
  },
  {
    q: 'Can someone else book the seat I selected?',
    a: 'No. The hold is atomic — only one fan can hold a seat at a time. The system guarantees no double-bookings, even when thousands of people are booking at the same moment.',
  },
  {
    q: 'How do I get my ticket?',
    a: 'Once payment is confirmed, your signed QR ticket appears in your account and is emailed to you. Present it at the door for scanning.',
  },
  {
    q: 'Is my ticket forgery-proof?',
    a: 'Yes. Each ticket encodes a cryptographically signed token, not just an ID. The signature is verified at the door, so a copied or altered ticket is rejected.',
  },
  {
    q: 'What if I need a refund?',
    a: 'Refund policies are set per event by the organizer. Check the event page for details, or contact the organizer through your bookings page.',
  },
  {
    q: 'Can I cancel a booking?',
    a: 'Cancellations are supported per the event’s policy. When a booking is cancelled, any waitlisted fans are notified that a seat opened up.',
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ink-200">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[16px] font-medium text-ink-950">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="grid transition-all duration-300"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-[14px] leading-relaxed text-ink-600">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section id="faq" className="border-t border-ink-200 bg-paper-2/60 py-20 lg:py-28">
      <div className="container-edge grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-wide text-lav-700">FAQ</p>
          <h2 className="mt-3 text-balance text-4xl font-medium text-ink-950 lg:text-5xl">
            Questions, answered
          </h2>
          <p className="mt-4 text-pretty text-lg text-ink-600">
            Everything about holds, checkout, and getting in the door.
          </p>
        </div>
        <div>
          {faqs.map((f) => (
            <Item key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  );
}