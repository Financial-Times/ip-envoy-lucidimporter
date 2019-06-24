const knex = require('knex');
const knexConfig = require('../knexfile');

const maxQueryTimeMillis = 2000;

const myKnex = knex(knexConfig.test);

const times = { };

myKnex.on('query', (query) => {
  const uid = query.__knexQueryUid;
  times[uid] = process.hrtime();
});

myKnex.on('query-response', (response, query) => {
  const uid = query.__knexQueryUid;
  const totalHrTime = process.hrtime(times[uid]);
  const totalTime = (totalHrTime[0] * 1000) + (totalHrTime[1] / 1000000);
  if (totalTime > maxQueryTimeMillis) {
    logger.info({
      event: 'SLOW_DB_QUERY',
      sql: query.sql,
      params: query.bindings,
      queryTime: totalTime
    });
  }
  delete times[uid];
});

module.exports = myKnex;