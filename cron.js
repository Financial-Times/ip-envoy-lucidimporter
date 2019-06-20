
const { promisify } = require('util');
const db = require('./db');

const importFromLucidchart = promisify(db.importFromLucidchart);

async function init() {
  console.debug('*** 1 - build up database... ***');
  await db.init();
    if (await importFromLucidchart('test')) {
      console.debug('*** 4 - New tracks imported - validating database... ***');
    }
  logger.debug('*** 5 - setup trigger system ... ***');
  await db.initTriggers();
  console.debug('Ready.');
}

module.exports = { init }
