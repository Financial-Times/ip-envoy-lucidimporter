const waitForExpect = require('wait-for-expect');
const { initialise } = require('../service/initialise');
const knex = require('../service/connect');

function delay(ms) {
  console.log(`Waiting for ${ms} milliseconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryFactory(testQuery, testFunctions) {
  await waitForExpect(async () => {
    const query = await knex.raw(`${testQuery}`);
    testFunctions(query.rows);
  }, 30000, 1000);
}

describe('Test Lucid chart Importer ', () => {
  beforeAll(async (done) => {
    await initialise();
    done();
  });

  it('it should return journey name TEST and journey Status 2', async (done) => {
    const query = 'SELECT core.journey.name, core.journey."journeyStatusId" FROM core.journey;';
    const expected = {
      name: 'test',
      journeyStatusId: 2
    };
    await queryFactory(query, (journey) => {
      expect(journey[0]).toEqual(expected);
    });
    done();
  });

  it('it should return silo Source, Stage1, Stage 2 and shelf', async (done) => {
    const query = 'SELECT core.silo.name FROM core.silo;';
    await queryFactory(query, (siloNames) => {
      const names = siloNames.map((silo) => silo.name);

      console.warn(names);

      expect(names).toEqual(expect.arrayContaining(['Source', 'Stage 1', 'Stage 2', 'Shelf']));
    });
    done();
  });

  it('it should have journey config and control group of 0.4', async (done) => {
    const query = 'SELECT core.journey.name, core.journey."journeyConfig" FROM core.journey;';
    const expected = {
      name: 'test',
      journeyConfig: {
        controlGroup: 0.4
      }
    };
    await queryFactory(query, (journey) => {
      expect(journey[0]).toEqual(expected);
    });
    done();
  });

  afterAll(async (done) => {
    delay(5);
    await knex.destroy();
    done();
  });
});
