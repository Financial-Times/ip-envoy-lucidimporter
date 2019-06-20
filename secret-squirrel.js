module.exports = {
	files: {
		allow: [
      'db/schema/create.ddl',
      'db/schema/drop.ddl',
      'db/schema/update_seed.ddl',
      'test/test.csv'
    ],
		allowOverrides: []
	},
	strings: {
		deny: [],
		denyOverrides: []
	}
};
