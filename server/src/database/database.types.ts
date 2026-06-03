import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './index';

export type Database = PostgresJsDatabase<typeof schema>;
