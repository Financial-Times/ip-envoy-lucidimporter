const { preParser } = require('../lib/parser');
const { dbBuilder } = require('../lib/builder');
const { isViolateRule } = require('../lib/isViolateRule');

module.exports = {
  preParser,
  dbBuilder,
  isViolateRule
};
