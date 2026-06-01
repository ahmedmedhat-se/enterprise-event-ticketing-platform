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
