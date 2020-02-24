
const { promisify } = require('util');
const path = require('path');
const { init } = require('./index');
const { initiateImport } = require('../src');
const knex = require('./connect');

const initiateLucidImport = promisify(initiateImport);

async function initialise() {
  console.debug('*** 1 - build up test database... ***');
  const jouneyFilePath = path.resolve(__dirname,'../data/test.csv');
  await init();
  if (await initiateLucidImport(jouneyFilePath, knex)) {
    console.debug('*** 4 - New tracks imported ***');
  }
  console.debug('Ready.');
}

module.exports = { initialise };
