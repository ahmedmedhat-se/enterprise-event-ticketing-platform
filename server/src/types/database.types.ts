import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/';

export type Database = PostgresJsDatabase<typeof schema>;
