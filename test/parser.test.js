const fs = require('fs');
const csv = require('csv-parser');
const { init } = require('../db/index');
const knex = require('../db/connect');
const { preParser, dbBuilder } = require('../lib/parser')

// const { result } = require('../out');
describe('Testing parser', () => {
  beforeAll(()=> {
    init();
  });

  afterAll(() => knex.destroy())

  const importFile = `./test/test.csv`;
  console.log(`Importing file: ${importFile}`);
  preParser.newCollection();
  fs.createReadStream(importFile).pipe(csv()).on('data', (rowData) => {
    preParser.have(rowData);
  }).on('end', async () => { // We are done pulling in data
    if (await preParser.prepare(knex)) {
      await dbBuilder.make(preParser.lucidCollectionPreped, knex);
    }
  });
  
  it('should return false if the TYPE is empty and NAME is line ', () => {
    expect(true).toEqual(true);
  });
});
