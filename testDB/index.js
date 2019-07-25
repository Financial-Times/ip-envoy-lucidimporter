const fs = require('fs'); // eslint-disable-line no-useless-catch
const csv = require('csv-parser');
const { promisify } = require('util');
const knex = require('./connect');
const { preParser, dbBuilder } = require('../src');
const readFile = promisify(fs.readFile);

async function getDDL(name) {
  return (await readFile(`./testDB/schema/${name}.ddl`)).toString();
}

async function exists() {
  try {
    const rs = await knex.raw(`
      SELECT COUNT(*)
      FROM information_schema.schemata
      WHERE schema_name = 'core'`);
    return (rs.rows[0].count === '1');
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function drop() {
  await knex.raw(await getDDL('drop'));
}

async function create() {
  await knex.raw(await getDDL('create'));
}

async function seed() {
  await knex.raw(await getDDL('update_seed'));
}

async function init(forceDrop = false) {
  console.log('DB init');
  try {
    const dbExists = await exists();
    if (dbExists) {
      await drop();
      console.log('existing schema flushed as requested in config');
    }
    await create();
    await seed();
    console.log('new db schema created');
  } catch (err) {
    console.log('DB init error', err);
  }
}

function importFromLucidchart(fileName, callback) {
  const importFile = `./testData/${fileName}.csv`;
  console.log(`Importing file: ${importFile}`);
  preParser.newCollection();
  fs.createReadStream(importFile).pipe(csv()).on('data', (rowData) => {
    preParser.have(rowData);
  }).on('end', async() => { // We are done pulling in data
    if (await preParser.prepare(knex)) {
      await dbBuilder.make(preParser.lucidCollectionPreped, knex);
    }
    callback();
  });
}

module.exports = {
  init,
  exists,
  getDDL,
  drop,
  create,
  seed,
  importFromLucidchart
};
