
const { promisify } = require('util');
const { init, importFromLucidchart } = require('./index');

const importFromLucid = promisify(importFromLucidchart);

async function initialise() {
  console.debug('*** 1 - build up database... ***');
  await init();
    if (await importFromLucid('my_ft_welcome_v2')) {
      console.debug('*** 4 - New tracks imported ***');
    }
  console.debug('Ready.');
}

module.exports = { initialise }
