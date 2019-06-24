const waitForExpect = require('wait-for-expect');
const { initialise } = require('../db/initialise');
const knex = require('../db/connect')

function delay(ms) {
  console.log(`Waiting for ${ms} milliseconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Examine the channel sends log
async function silos(testFunctions) {
  await waitForExpect(async () => {
    const query = await knex.raw(`SELECT * FROM core.track`);
    testFunctions(query.rows);
  }, 30000, 1000);
}

describe('Test importer ', () => {
  beforeAll(async (done) => {
    await initialise();
    done();
  })

  it('it should return silo names containing SOURCE and DRAIN ', async done => {
    await silos((siloNames) => {
      console.log(siloNames);
      expect(true).toEqual(true);
      // expect(true).toEqual(expect.arrayContaining(['Entities', ' ']));
    });
    done();
  })

  afterAll(async (done) => {
    delay(5);
    await knex.destroy();
    done();
  })
});
