const knex = require('knex'); // eslint-disable-line no-useless-catch
const knexConfig = require('../knexfile');

const myKnex = knex(knexConfig.test);

module.exports = myKnex;
