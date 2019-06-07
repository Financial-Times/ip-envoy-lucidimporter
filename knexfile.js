const config = require('./config');

module.exports = {
  production: {
    client: 'pg',
    debug: true,
    connection: `${config.pg_host}?ssl=true`
  }
};
