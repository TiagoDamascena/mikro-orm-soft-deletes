import type { Options } from '@mikro-orm/postgresql';

/**
 * The connection of the tests, read from the environment (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`). Each
 * suite has its own database, created on the first run, so the suites can run in parallel.
 */
export function databaseOptions(dbName: string): Partial<Options> {
  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    dbName,
  };
}
