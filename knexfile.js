const config = require('./config');

module.exports = {
  production: {
    client: 'pg',
    connection: 'postgres://c4_admin:examplePassword@localhost:5433/c4',
  }
};