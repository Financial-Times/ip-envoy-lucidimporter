
const { promisify } = require('util');
const { init, importFromLucidchart } = require('./index');

const importFromLucid = promisify(importFromLucidchart);

async function initialise() {
  console.debug('*** 1 - build up database... ***');
  await init();
    if (await importFromLucid('lucidImporterTest')) {
      console.debug('*** 4 - New tracks imported ***');
    }
  console.debug('Ready.');
}

module.exports = { initialise }
