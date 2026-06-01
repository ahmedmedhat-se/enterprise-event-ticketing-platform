import { relations } from 'drizzle-orm';
import {
  bookings,
  events,
  organizerAccounts,
  paymentTransactions,
  pricingTiers,
  seats,
  tickets,
  users,
  waitlist,
} from './schema';

// ==================== USERS RELATIONS ====================
export const usersRelations = relations(users, ({ one, many }) => ({
  organizerAccount: one(organizerAccounts, {
    fields: [users.id],
    references: [organizerAccounts.userId],
  }),
  organizedEvents: many(events),
  bookings: many(bookings),
  tickets: many(tickets),
  waitlistEntries: many(waitlist),
}));

// ==================== ORGANIZER ACCOUNTS RELATIONS ====================
export const organizerAccountsRelations = relations(
  organizerAccounts,
  ({ one }) => ({
    user: one(users, {
      fields: [organizerAccounts.userId],
      references: [users.id],
    }),
  }),
);

// ==================== EVENTS RELATIONS ====================
export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
    relationName: 'eventOrganizer',
  }),
  pricingTiers: many(pricingTiers),
  seats: many(seats),
  bookings: many(bookings),
  waitlistEntries: many(waitlist),
  tickets: many(tickets),
}));

// ==================== PRICING TIERS RELATIONS ====================
export const pricingTiersRelations = relations(
  pricingTiers,
  ({ one, many }) => ({
    event: one(events, {
      fields: [pricingTiers.eventId],
      references: [events.id],
    }),
    seats: many(seats),
  }),
);

// ==================== SEATS RELATIONS ====================
export const seatsRelations = relations(seats, ({ one, many }) => ({
  event: one(events, {
    fields: [seats.eventId],
    references: [events.id],
  }),
  pricingTier: one(pricingTiers, {
    fields: [seats.tierId],
    references: [pricingTiers.id],
  }),
  tickets: many(tickets),
}));

// ==================== BOOKINGS RELATIONS ====================
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [bookings.eventId],
    references: [events.id],
  }),
  paymentTransactions: many(paymentTransactions),
  tickets: many(tickets),
}));

// ==================== WAITLIST RELATIONS ====================
export const waitlistRelations = relations(waitlist, ({ one }) => ({
  user: one(users, {
    fields: [waitlist.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [waitlist.eventId],
    references: [events.id],
  }),
}));

// ==================== TICKETS RELATIONS ====================
export const ticketsRelations = relations(tickets, ({ one }) => ({
  booking: one(bookings, {
    fields: [tickets.bookingId],
    references: [bookings.id],
  }),
  seat: one(seats, {
    fields: [tickets.seatId],
    references: [seats.id],
  }),
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
}));

// ==================== PAYMENT TRANSACTIONS RELATIONS ====================
export const paymentTransactionsRelations = relations(
  paymentTransactions,
  ({ one }) => ({
    booking: one(bookings, {
      fields: [paymentTransactions.bookingId],
      references: [bookings.id],
    }),
  }),
);
