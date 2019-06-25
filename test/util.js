
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
module.exports = {
  delay,
  queryFactory
}
