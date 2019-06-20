const { init } = require('../cron');
const knex = require('../db/connect')

function delay(ms) {
  console.log(`Waiting for ${ms} milliseconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Test importer ', () => {
  beforeAll(() => {
    init();
  })

  it('return true', async done => {
    expect(true).toEqual(true);
    done();
  })
  afterAll(async (done) => {
    delay(5);
    // knex.destroy();
    done();
  })
});
