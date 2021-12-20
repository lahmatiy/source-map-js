import { equal } from 'assert';
import * as sourceMap from 'source-map-js';

it('test that the api is properly exposed in the top level', () => {
  equal(typeof sourceMap.SourceMapGenerator, "function");
  equal(typeof sourceMap.SourceMapConsumer, "function");
});
