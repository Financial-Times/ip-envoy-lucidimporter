const path = require('path');

const client = 'pg';

module.exports = {
  test: {
    client,
    connection: `${process.env.DATABASE_URL}`,
    pool: {
      min: 1,
      max: 1
    }
  }
};
