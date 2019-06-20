const fs = require('fs');
const { promisify } = require('util');
const knex = require('./connect');

const readFile = promisify(fs.readFile);

async function getDDL(name) {
  return (await readFile(`./db/schema/${name}.ddl`)).toString();
}

async function exists() {
  try {
    const rs = await knex.raw(`
      SELECT COUNT(*)
      FROM information_schema.schemata
      WHERE schema_name = 'core'`);
    return (rs.rows[0].count === '1');
  } catch (err) {
    logger.error(err);
    return false;
  }
}

async function drop() {
  await knex.raw(await getDDL('drop'));
}

async function create() {
  await knex.raw(await getDDL('create'));
}

async function init() {
  try {
    const dbExists = await exists();
    if (dbExists) {
      await drop();
    }
    await create();
    console.log('New db schema created');
  } catch (err) {
    console.log('DB init error', err);
  }
}

module.exports = {
  init
};
