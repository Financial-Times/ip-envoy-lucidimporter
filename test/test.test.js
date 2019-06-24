const waitForExpect = require('wait-for-expect');
const { initialise } = require('../db/initialise');
const knex = require('../db/connect')

function delay(ms) {
  console.log(`Waiting for ${ms} milliseconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchSilos(testFunctions) {
  const query = await knex.raw(`
    SELECT silo.name AS "siloName" from core.entity_silo as es
    LEFT join core.silo as silo
    ON silo."siloId" = es."siloId"
    `);
  const siloNames = query.rows.map((row) => row.siloName);
  console.log('names: ', siloNames )
  testFunctions(siloNames);
}

describe('Test importer ', () => {
  beforeAll(async (done) => {
    jest.setTimeout(30000);
    await initialise();
    done();
  })

  it('it should return silo names containing SOURCE and DRAIN ', async done => {
    await searchSilos(siloNames => {
      expect(siloNames).toEqual(expect.arrayContaining(['Source', 'Drain']));
    });
    done();
  })

  afterAll(async (done) => {
    // delay(5);
    // await knex.destroy();
    // done();
  })
});
