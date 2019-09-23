const client = 'pg';

console.warn(process.env.DATABASE_URL || '127.0.0.1');

module.exports = {
  test: {
    client,
    connection: process.env.DATABASE_URL || '127.0.0.1',
    pool: {
      min: 0,
      max: 1
    }
  }
};
