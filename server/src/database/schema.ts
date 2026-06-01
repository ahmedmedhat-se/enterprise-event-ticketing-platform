import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  decimal,
  integer,
  text,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';

// ==================== USERS ====================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }).unique().notNull(),
  role: varchar('role', { length: 20 }).notNull().default('fan'), // 'fan','organizer','admin'
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// ==================== ORGANIZER ACCOUNTS ====================
export const organizerAccounts = pgTable('organizer_accounts', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  businessRegistrationNumber: varchar('business_registration_number', {
    length: 100,
  }),
  taxId: varchar('tax_id', { length: 100 }),
  approvalStatus: varchar('approval_status', { length: 20 }).default('pending'), // 'pending','approved','rejected'
  approvedAt: timestamp('approved_at'),
});

// ==================== EVENTS ====================
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizerId: uuid('organizer_id')
    .references(() => users.id)
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 100 }),
  eventType: varchar('event_type', { length: 20 }).notNull(), // 'seated','general_admission'
  salesStartAt: timestamp('sales_start_at').notNull(),
  salesEndAt: timestamp('sales_end_at'),
  totalSeats: integer('total_seats'), // for seated events (stored for quick display)
  totalCapacity: integer('total_capacity'), // for general admission
  date: timestamp('date').notNull(), // event start date
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== PRICING TIERS ====================
export const pricingTiers = pgTable('pricing_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id')
    .references(() => events.id)
    .notNull(),
  tierName: varchar('tier_name', { length: 100 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  seatsCount: integer('seats_count').notNull(),
  earlyBirdPrice: decimal('early_bird_price', { precision: 10, scale: 2 }),
  earlyBirdExpiration: timestamp('early_bird_expiration'),
  maxPerOrder: integer('max_per_order'),
});

// ==================== SEATS (seated events) ====================
export const seats = pgTable(
  'seats',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .references(() => events.id)
      .notNull(),
    tierId: uuid('tier_id')
      .references(() => pricingTiers.id)
      .notNull(),
    seatRow: varchar('seat_row', { length: 10 }).notNull(),
    seatNumber: integer('seat_number').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('available'), // 'available','held','booked'
  },
  (table) => ({
    unq: unique().on(table.eventId, table.seatRow, table.seatNumber),
  }),
);

// ==================== BOOKINGS ====================
export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  eventId: uuid('event_id')
    .references(() => events.id)
    .notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending','confirmed','cancelled','refunded'
  paymentId: varchar('payment_id', { length: 255 }), // internal payment reference
  serviceFee: decimal('service_fee', { precision: 10, scale: 2 }),
  ticketsPrice: decimal('tickets_price', { precision: 10, scale: 2 }),
  grandTotal: decimal('grand_total', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== WAITLIST ====================
export const waitlist = pgTable('waitlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id')
    .references(() => events.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  status: varchar('status', { length: 20 }).default('waiting'), // 'waiting','offered','expired','converted'
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== TICKETS ====================
export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketNumber: varchar('ticket_number', { length: 30 }).unique().notNull(),
  bookingId: uuid('booking_id')
    .references(() => bookings.id)
    .notNull(),

  seatId: uuid('seat_id').references(() => seats.id), // null for general admission
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  eventId: uuid('event_id')
    .references(() => events.id)
    .notNull(),
  status: varchar('status', { length: 20 }).notNull().default('valid'), // 'valid','cancelled','checked_in'
  qrCodePayload: text('qr_code_payload').notNull(),
  checkedIn: boolean('checked_in').default(false),
  checkInAt: timestamp('check_in_at'),
});

// ==================== PAYMENT TRANSACTIONS ====================
export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookingId: uuid('booking_id')
    .references(() => bookings.id)
    .notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  status: varchar('status', { length: 20 }).notNull(), // e.g., 'succeeded','failed','refunded'
  gateway: varchar('gateway', { length: 30 }).notNull(),
  gatewayTransactionId: varchar('gateway_transaction_id', { length: 255 }),
  processedAt: timestamp('processed_at').defaultNow(),
});
