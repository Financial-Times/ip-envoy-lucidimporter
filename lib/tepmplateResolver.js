const _ = require('lodash'); // eslint-disable-line no-unused-vars, no-useless-catch

function resolveTemplate(str, vars) {
  // based on code pinched from: https://github.com/mikemaccana/dynamic-template/blob/master/index.js
  // console.log(templateString);
  if (typeof str !== 'string') return false;
  if (!str.includes('${')) return false; // can't include template so don't bother parsing it
  const keys = Object.keys(vars);
  const values = Object.values(vars);
  // Only trusted usesrs may use the lucidChart importer, otherwise this will need protecting more
  try {
    const templateFunction = new Function(...keys, `return \`${str}\`;`); // eslint-disable-line no-new-func
    return templateFunction(...values);
  } catch (e) {
    console.log(`string fed into resolveTemple was ${str}`);
    console.log(`keys fed into resolveTemple were ${keys}`);

    throw e;
  }
}

// loosely based on code found here: https://stackoverflow.com/questions/25333918/js-deep-map-function
function deepResolveTemplate(obj, iterator, context) {
  return _.transform(obj, (result, val, key) => {
    delete result[key];
    result[resolveTemplate(key, context) || key] = _.isObject(val)
      ? deepResolveTemplate(val, iterator, context) : iterator.call(context, val);
  });
}

module.exports = { resolveTemplate, deepResolveTemplate };
