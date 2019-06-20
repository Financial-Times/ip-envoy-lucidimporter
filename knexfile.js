const path = require('path');

const client = 'pg';

module.exports = {
  test: {
    client,
    connection: `${process.env.DATABASE_URL}`,
    migrations: {
      directory: path.join(__dirname, 'migrations')
    },
    pool: {
      min: 0,
      max: 1
    }
  }
};
