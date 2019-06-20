const { init } = require('../cron');
const knex = require('../db/connect')

describe('Test importer ', () => {
  beforeAll(() => {
    init();
  })

  it('return true', async done => {
    expect(true).toEqual(true);
    done();
  })
  afterAll(async (done) => {
    knex.destroy();
    done();
  })
});
