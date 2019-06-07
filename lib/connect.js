const knex = require('knex');
const knexConfig = require('../knexfile');

const myKnex = knex(knexConfig.production);

module.exports = myKnex;