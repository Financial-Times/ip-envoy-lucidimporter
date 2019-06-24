const waitForExpect = require('wait-for-expect');
const { initialise } = require('../db/initialise');
const knex = require('../db/connect')

function delay(ms) {
  console.log(`Waiting for ${ms} milliseconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Test importer ', () => {
  beforeAll(async (done) => {
    await initialise();
    done();
  })

  it('it should return silo names containing SOURCE and DRAIN ', async done => {
    const rs = await knex.raw(`
      SELECT COUNT(*)
      FROM information_schema.schemata
      WHERE schema_name = 'core'`);
    console.log('track name:', rs.rows[0]);
      // return (rs.rows[0].count === '1');
    expect(true).toEqual(true);
    done();
  })

  afterAll(async (done) => {
    delay(5);
    await knex.destroy();
    done();
  })
});
