const config = require('./config');

const client = 'pg';

module.exports = {
  production: {
    client,
    connection: `${config.pg_host}?ssl=true`,
  }
};