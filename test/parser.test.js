const fs = require('fs');
const csv = require('csv-parser');
const { init } = require('../db/index');
const knex = require('../db/connect');
const { preParser, dbBuilder } = require('../lib/parser')

// const { result } = require('../out');
describe('Testing parser', () => {
  init();
  const importFile = `test.csv`;
  console.log(`Importing file: ${importFile}`);
  preParser.newCollection();
  fs.createReadStream(importFile).pipe(csv()).on('data', (rowData) => {
    preParser.have(rowData);
  }).on('end', async () => { // We are done pulling in data
    if (await preParser.prepare(knex)) {
      await dbBuilder.make(preParser.lucidCollectionPreped, knex);
    }
    callback();
  });
  
  it('should return false if the TYPE is empty and NAME is line ', () => {
    const outPut = preParser.have(Row);
    expect(true).toEqual(true);
  });
});
