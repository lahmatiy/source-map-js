import { assertMapping } from "./util.js";
import { SourceMapConsumer } from '../lib/source-map-consumer.js';
import { SourceMapGenerator } from '../lib/source-map-generator.js';

it('test eating our own dog food', () => {
  const smg = new SourceMapGenerator({
    file: 'testing.js',
    sourceRoot: '/wu/tang'
  });

  smg.addMapping({
    source: 'gza.coffee',
    original: { line: 1, column: 0 },
    generated: { line: 2, column: 2 }
  });

  smg.addMapping({
    source: 'gza.coffee',
    original: { line: 2, column: 0 },
    generated: { line: 3, column: 2 }
  });

  smg.addMapping({
    source: 'gza.coffee',
    original: { line: 3, column: 0 },
    generated: { line: 4, column: 2 }
  });

  smg.addMapping({
    source: 'gza.coffee',
    original: { line: 4, column: 0 },
    generated: { line: 5, column: 2 }
  });

  smg.addMapping({
    source: 'gza.coffee',
    original: { line: 5, column: 10 },
    generated: { line: 6, column: 12 }
  });

  const smc = new SourceMapConsumer(smg.toString());

  // Exact
  assertMapping(2, 2, '/wu/tang/gza.coffee', 1, 0, null, null, smc);
  assertMapping(3, 2, '/wu/tang/gza.coffee', 2, 0, null, null, smc);
  assertMapping(4, 2, '/wu/tang/gza.coffee', 3, 0, null, null, smc);
  assertMapping(5, 2, '/wu/tang/gza.coffee', 4, 0, null, null, smc);
  assertMapping(6, 12, '/wu/tang/gza.coffee', 5, 10, null, null, smc);

  // Fuzzy

  // Generated to original with default (glb) bias.
  assertMapping(2, 0, null, null, null, null, null, smc, true);
  assertMapping(2, 9, '/wu/tang/gza.coffee', 1, 0, null, null, smc, true);
  assertMapping(3, 0, null, null, null, null, null, smc, true);
  assertMapping(3, 9, '/wu/tang/gza.coffee', 2, 0, null, null, smc, true);
  assertMapping(4, 0, null, null, null, null, null, smc, true);
  assertMapping(4, 9, '/wu/tang/gza.coffee', 3, 0, null, null, smc, true);
  assertMapping(5, 0, null, null, null, null, null, smc, true);
  assertMapping(5, 9, '/wu/tang/gza.coffee', 4, 0, null, null, smc, true);
  assertMapping(6, 0, null, null, null, null, null, smc, true);
  assertMapping(6, 9, null, null, null, null, null, smc, true);
  assertMapping(6, 13, '/wu/tang/gza.coffee', 5, 10, null, null, smc, true);

  // Generated to original with lub bias.
  assertMapping(2, 0, '/wu/tang/gza.coffee', 1, 0, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);
  assertMapping(2, 9, null, null, null, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);
  assertMapping(3, 0, '/wu/tang/gza.coffee', 2, 0, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);
  assertMapping(3, 9, null, null, null, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);
  assertMapping(4, 0, '/wu/tang/gza.coffee', 3, 0, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);
  assertMapping(4, 9, null, null, null, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);
  assertMapping(5, 0, '/wu/tang/gza.coffee', 4, 0, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);
  assertMapping(5, 9, null, null, null, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);
  assertMapping(6, 0, '/wu/tang/gza.coffee', 5, 10, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);
  assertMapping(6, 9, '/wu/tang/gza.coffee', 5, 10, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);
  assertMapping(6, 13, null, null, null, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, true);

  // Original to generated with default (glb) bias
  assertMapping(2, 2, '/wu/tang/gza.coffee', 1, 1, null, null, smc, null, true);
  assertMapping(3, 2, '/wu/tang/gza.coffee', 2, 3, null, null, smc, null, true);
  assertMapping(4, 2, '/wu/tang/gza.coffee', 3, 6, null, null, smc, null, true);
  assertMapping(5, 2, '/wu/tang/gza.coffee', 4, 9, null, null, smc, null, true);
  assertMapping(5, 2, '/wu/tang/gza.coffee', 5, 9, null, null, smc, null, true);
  assertMapping(6, 12, '/wu/tang/gza.coffee', 6, 19, null, null, smc, null, true);

  // Original to generated with lub bias.
  assertMapping(3, 2, '/wu/tang/gza.coffee', 1, 1, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, null, true);
  assertMapping(4, 2, '/wu/tang/gza.coffee', 2, 3, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, null, true);
  assertMapping(5, 2, '/wu/tang/gza.coffee', 3, 6, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, null, true);
  assertMapping(6, 12, '/wu/tang/gza.coffee', 4, 9, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, null, true);
  assertMapping(6, 12, '/wu/tang/gza.coffee', 5, 9, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, null, true);
  assertMapping(null, null, '/wu/tang/gza.coffee', 6, 19, null, SourceMapConsumer.LEAST_UPPER_BOUND, smc, null, true);
});
