const { init } = require('../cron');

describe('Test importer ', () => {
  beforeAll(() => {
    init();
  })

  it('return true', async done => {
    expect(true).toEqual(true);
    done();
  })
});
