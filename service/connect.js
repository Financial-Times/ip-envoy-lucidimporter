const knex = require('knex');
const knexConfig = require('../knexfile');

const myKnex = knex(knexConfig.test);

module.exports = myKnex;
