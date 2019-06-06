const knex = require('knex');
const knexConfig = require('../../knexfile');
const config = require('../../config');

let connConfig;

if (config.production) {
  connConfig = knexConfig.production;
}

const myKnex = knex(connConfig);

module.exports = myKnex;