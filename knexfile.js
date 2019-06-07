const config = require('./config');

module.exports = {
  production: {
    client: 'pg',
    connection: `${config.pg_host}`,
  }
};
