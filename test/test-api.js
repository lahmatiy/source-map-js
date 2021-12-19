const assert = require('assert');
const sourceMap = require('../lib');

it('test that the api is properly exposed in the top level', () => {
  assert.equal(typeof sourceMap.SourceMapGenerator, "function");
  assert.equal(typeof sourceMap.SourceMapConsumer, "function");
  assert.equal(typeof sourceMap.SourceNode, "function");
});
