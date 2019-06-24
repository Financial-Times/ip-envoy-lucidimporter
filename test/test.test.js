const waitForExpect = require('wait-for-expect');
const { initialise } = require('../db/initialise');
const knex = require('../db/connect')

function delay(ms) {
  console.log(`Waiting for ${ms} milliseconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryFactory(testQuery , testFunctions) {
  await waitForExpect(async () => {
    const query = await knex.raw(`${testQuery}`);
    testFunctions(query.rows);
  }, 30000, 1000);
}

describe('Test Lucid chart Importer ', () => {
  beforeAll(async (done) => {
    await initialise();
    done();
  })

  it('it should return track name TEST and Track Status 2', async done => {
    const query = 'SELECT core.track.name, core.track."trackStatusId" FROM core.track;';
    const expected = {
      name: 'test',
      trackStatusId: 2
    }
    await queryFactory(query, track => {
      expect(track[0]).toEqual(expected);
    });
    done();
  })
  
  it('it should return silo SOURCE and SHELVE', async done => {
    const query = 'SELECT core.silo.name FROM core.silo;'
    await queryFactory(query, siloNames => {
      const names = siloNames.map(silo => silo.name);
      expect(names).toEqual(expect.arrayContaining(['Source', 'Shelf', 'Stage 1', 'Stage 2']));
    });
    done();
  })

  afterAll(async (done) => {
    delay(5);
    await knex.destroy();
    done();
  })
});
