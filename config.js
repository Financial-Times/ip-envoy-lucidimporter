const config = exports;
const entityType = 'user';
// Database
if (entityType === 'user') {
  config.pg_host = process.env.DATABASE_URL || process.env.POSTGRES_HOST || '127.0.0.1';
}
