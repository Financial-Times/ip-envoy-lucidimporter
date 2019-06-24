const { init } = require('../cron');
const knex = require('../db/connect')

function delay(ms) {
  console.log(`Waiting for ${ms} milliseconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Test importer ', async () => {
  beforeAll(async (done) => {
    await init();
    done();
  })

  it('return true', async done => {
    expect(true).toEqual(true);
    done();
  })
  afterAll(async (done) => {
    delay(5);
    await knex.destroy();
    done();
  })
});
