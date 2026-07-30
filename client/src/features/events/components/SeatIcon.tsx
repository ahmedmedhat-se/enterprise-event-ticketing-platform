import type { SeatStatus } from '../../../shared/api/types';

// A chair drawn from the front: seat base, backrest, two arm lines.
// Color encodes status. Size scales down on small viewports.
const styles: Record<SeatStatus, { fill: string; stroke: string; label: string }> = {
  available: { fill: 'var(--color-ink-50)', stroke: 'var(--color-ink-200)', label: 'available' },
  held: { fill: 'var(--color-lav-200)', stroke: 'var(--color-lav-400)', label: 'held' },
  booked: { fill: 'var(--color-ink-800)', stroke: 'var(--color-ink-700)', label: 'booked' },
};

interface Props {
  seatId?: string;        // Seat UUID — used as a data attribute for click handlers
  status: SeatStatus;
  label: string;          // e.g. "A3"
  active?: boolean;
  /** Optional click handler; receives the seat UUID and ref */
  onSelect?: (seatId: string, label: string) => void;
}

export function SeatIcon({ seatId, status, label, active, onSelect }: Props) {
  const s = styles[status];

  const handleClick = () => {
    if (onSelect && seatId) onSelect(seatId, label);
  };

  return (
    <button
      type="button"
      disabled={status !== 'available'}
      aria-label={`Seat ${label} — ${s.label}`}
      data-seat-id={seatId}
      onClick={handleClick}
      className={`flex flex-col items-center transition-all duration-300 focus-visible:outline-2 focus-visible:outline-lav-500 ${
        status === 'available'
          ? 'cursor-pointer hover:scale-110'
          : 'cursor-default'
      } ${active ? 'z-10 scale-125' : ''}`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px]"
      >
        {/* backrest */}
        <path
          d="M6 5.5C6 4.67 6.67 4 7.5 4h9c.83 0 1.5.67 1.5 1.5V13H6V5.5Z"
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth="1"
        />
        {/* seat base */}
        <path
          d="M5 13h14v1.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V13Z"
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth="1"
        />
        {/* left leg */}
        <path d="M7 16.5v3.5" stroke={s.stroke} strokeWidth="1.4" strokeLinecap="round" />
        {/* right leg */}
        <path d="M17 16.5v3.5" stroke={s.stroke} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="mt-0.5 text-[7px] leading-none text-ink-400 sm:text-[8px]">
        {label}
      </span>
    </button>
  );
}
