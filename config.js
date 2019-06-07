const config = exports;
const USER = 'user';
const ANON = 'anon';

config.entityType = process.env.ENTITY_TYPE || USER; // TODO: validation?

// Database
if (config.entityType === USER) {
  config.pg_host = process.env.DATABASE_URL || process.env.POSTGRES_HOST || 'postgres://c4_admin:examplePassword@localhost:5433/c4';
}

if (config.entityType === ANON) {
  config.pg_host = process.env.DATABASE_URL_ANON || process.env.POSTGRES_HOST_ANON || 'postgres://c4_admin:examplePassword@localhost:5433/c4';
}