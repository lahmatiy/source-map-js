import { doesNotThrow, ok, equal, throws } from 'assert';
import { SourceMapConsumer, IndexedSourceMapConsumer, BasicSourceMapConsumer } from '../lib/source-map-consumer.js';
import { SourceMapGenerator } from '../lib/source-map-generator.js';
import {
  testMap,
  indexedTestMap,
  indexedTestMapDifferentSourceRoots,
  testMapNoSourceRoot,
  testMapEmptySourceRoot,
  assertMapping,
  testMapWithSourcesContent,
  testMapRelativeSources
} from "./util.js";

it('test that we can instantiate with a string or an object', () => {
  doesNotThrow(() => {
    new SourceMapConsumer(testMap);
  });
  doesNotThrow(() => {
    new SourceMapConsumer(JSON.stringify(testMap));
  });
});

it('test that the object returned from new SourceMapConsumer inherits from SourceMapConsumer', () => {
  ok(new SourceMapConsumer(testMap) instanceof SourceMapConsumer);
});

it('test that a BasicSourceMapConsumer is returned for sourcemaps without sections', () => {
  ok(new SourceMapConsumer(testMap) instanceof BasicSourceMapConsumer);
});

it('test that an IndexedSourceMapConsumer is returned for sourcemaps with sections', () => {
  ok(new SourceMapConsumer(indexedTestMap) instanceof IndexedSourceMapConsumer);
});

// FIXME: split into separate tests
it('test that the `sources` field has the original sources', () => {
  let map;
  let sources;

  map = new SourceMapConsumer(testMap);
  sources = map.sources;
  equal(sources[0], '/the/root/one.js');
  equal(sources[1], '/the/root/two.js');
  equal(sources.length, 2);

  map = new SourceMapConsumer(indexedTestMap);
  sources = map.sources;
  equal(sources[0], '/the/root/one.js');
  equal(sources[1], '/the/root/two.js');
  equal(sources.length, 2);

  map = new SourceMapConsumer(indexedTestMapDifferentSourceRoots);
  sources = map.sources;
  equal(sources[0], '/the/root/one.js');
  equal(sources[1], '/different/root/two.js');
  equal(sources.length, 2);

  map = new SourceMapConsumer(testMapNoSourceRoot);
  sources = map.sources;
  equal(sources[0], 'one.js');
  equal(sources[1], 'two.js');
  equal(sources.length, 2);

  map = new SourceMapConsumer(testMapEmptySourceRoot);
  sources = map.sources;
  equal(sources[0], 'one.js');
  equal(sources[1], 'two.js');
  equal(sources.length, 2);
});

// FIXME: split into separate tests
it('test that the source root is reflected in a mapping\'s source field', () => {
  let map;
  let mapping;

  map = new SourceMapConsumer(testMap);

  mapping = map.originalPositionFor({
    line: 2,
    column: 1
  });
  equal(mapping.source, '/the/root/two.js');

  mapping = map.originalPositionFor({
    line: 1,
    column: 1
  });
  equal(mapping.source, '/the/root/one.js');


  map = new SourceMapConsumer(testMapNoSourceRoot);

  mapping = map.originalPositionFor({
    line: 2,
    column: 1
  });
  equal(mapping.source, 'two.js');

  mapping = map.originalPositionFor({
    line: 1,
    column: 1
  });
  equal(mapping.source, 'one.js');


  map = new SourceMapConsumer(testMapEmptySourceRoot);

  mapping = map.originalPositionFor({
    line: 2,
    column: 1
  });
  equal(mapping.source, 'two.js');

  mapping = map.originalPositionFor({
    line: 1,
    column: 1
  });
  equal(mapping.source, 'one.js');
});

it('test mapping tokens back exactly', () => {
  const map = new SourceMapConsumer(testMap);

  assertMapping(1, 1, '/the/root/one.js', 1, 1, null, null, map);
  assertMapping(1, 5, '/the/root/one.js', 1, 5, null, null, map);
  assertMapping(1, 9, '/the/root/one.js', 1, 11, null, null, map);
  assertMapping(1, 18, '/the/root/one.js', 1, 21, 'bar', null, map);
  assertMapping(1, 21, '/the/root/one.js', 2, 3, null, null, map);
  assertMapping(1, 28, '/the/root/one.js', 2, 10, 'baz', null, map);
  assertMapping(1, 32, '/the/root/one.js', 2, 14, 'bar', null, map);

  assertMapping(2, 1, '/the/root/two.js', 1, 1, null, null, map);
  assertMapping(2, 5, '/the/root/two.js', 1, 5, null, null, map);
  assertMapping(2, 9, '/the/root/two.js', 1, 11, null, null, map);
  assertMapping(2, 18, '/the/root/two.js', 1, 21, 'n', null, map);
  assertMapping(2, 21, '/the/root/two.js', 2, 3, null, null, map);
  assertMapping(2, 28, '/the/root/two.js', 2, 10, 'n', null, map);
});

it('test mapping tokens back exactly in indexed source map', () => {
  const map = new SourceMapConsumer(indexedTestMap);

  assertMapping(1, 1, '/the/root/one.js', 1, 1, null, null, map);
  assertMapping(1, 5, '/the/root/one.js', 1, 5, null, null, map);
  assertMapping(1, 9, '/the/root/one.js', 1, 11, null, null, map);
  assertMapping(1, 18, '/the/root/one.js', 1, 21, 'bar', null, map);
  assertMapping(1, 21, '/the/root/one.js', 2, 3, null, null, map);
  assertMapping(1, 28, '/the/root/one.js', 2, 10, 'baz', null, map);
  assertMapping(1, 32, '/the/root/one.js', 2, 14, 'bar', null, map);

  assertMapping(2, 1, '/the/root/two.js', 1, 1, null, null, map);
  assertMapping(2, 5, '/the/root/two.js', 1, 5, null, null, map);
  assertMapping(2, 9, '/the/root/two.js', 1, 11, null, null, map);
  assertMapping(2, 18, '/the/root/two.js', 1, 21, 'n', null, map);
  assertMapping(2, 21, '/the/root/two.js', 2, 3, null, null, map);
  assertMapping(2, 28, '/the/root/two.js', 2, 10, 'n', null, map);
});

it('test mapping tokens fuzzy', () => {
  const map = new SourceMapConsumer(testMap);

  // Finding original positions with default (glb) bias.
  assertMapping(1, 20, '/the/root/one.js', 1, 21, 'bar', null, map, true);
  assertMapping(1, 30, '/the/root/one.js', 2, 10, 'baz', null, map, true);
  assertMapping(2, 12, '/the/root/two.js', 1, 11, null, null, map, true);

  // Finding original positions with lub bias.
  assertMapping(1, 16, '/the/root/one.js', 1, 21, 'bar', SourceMapConsumer.LEAST_UPPER_BOUND, map, true);
  assertMapping(1, 26, '/the/root/one.js', 2, 10, 'baz', SourceMapConsumer.LEAST_UPPER_BOUND, map, true);
  assertMapping(2, 6, '/the/root/two.js', 1, 11, null, SourceMapConsumer.LEAST_UPPER_BOUND, map, true);

  // Finding generated positions with default (glb) bias.
  assertMapping(1, 18, '/the/root/one.js', 1, 22, 'bar', null, map, null, true);
  assertMapping(1, 28, '/the/root/one.js', 2, 13, 'baz', null, map, null, true);
  assertMapping(2, 9, '/the/root/two.js', 1, 16, null, null, map, null, true);

  // Finding generated positions with lub bias.
  assertMapping(1, 18, '/the/root/one.js', 1, 20, 'bar', SourceMapConsumer.LEAST_UPPER_BOUND, map, null, true);
  assertMapping(1, 28, '/the/root/one.js', 2, 7, 'baz', SourceMapConsumer.LEAST_UPPER_BOUND, map, null, true);
  assertMapping(2, 9, '/the/root/two.js', 1, 6, null, SourceMapConsumer.LEAST_UPPER_BOUND, map, null, true);
});

it('test mapping tokens fuzzy in indexed source map', () => {
  const map = new SourceMapConsumer(indexedTestMap);

  // Finding original positions with default (glb) bias.
  assertMapping(1, 20, '/the/root/one.js', 1, 21, 'bar', null, map, true);
  assertMapping(1, 30, '/the/root/one.js', 2, 10, 'baz', null, map, true);
  assertMapping(2, 12, '/the/root/two.js', 1, 11, null, null, map, true);

  // Finding original positions with lub bias.
  assertMapping(1, 16, '/the/root/one.js', 1, 21, 'bar', SourceMapConsumer.LEAST_UPPER_BOUND, map, true);
  assertMapping(1, 26, '/the/root/one.js', 2, 10, 'baz', SourceMapConsumer.LEAST_UPPER_BOUND, map, true);
  assertMapping(2, 6, '/the/root/two.js', 1, 11, null, SourceMapConsumer.LEAST_UPPER_BOUND, map, true);

  // Finding generated positions with default (glb) bias.
  assertMapping(1, 18, '/the/root/one.js', 1, 22, 'bar', null, map, null, true);
  assertMapping(1, 28, '/the/root/one.js', 2, 13, 'baz', null, map, null, true);
  assertMapping(2, 9, '/the/root/two.js', 1, 16, null, null, map, null, true);

  // Finding generated positions with lub bias.
  assertMapping(1, 18, '/the/root/one.js', 1, 20, 'bar', SourceMapConsumer.LEAST_UPPER_BOUND, map, null, true);
  assertMapping(1, 28, '/the/root/one.js', 2, 7, 'baz', SourceMapConsumer.LEAST_UPPER_BOUND, map, null, true);
  assertMapping(2, 9, '/the/root/two.js', 1, 6, null, SourceMapConsumer.LEAST_UPPER_BOUND, map, null, true);
});

it('test mappings and end of lines', () => {
  const smg = new SourceMapGenerator({
    file: 'foo.js'
  });
  smg.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 1, column: 1 },
    source: 'bar.js'
  });
  smg.addMapping({
    original: { line: 2, column: 2 },
    generated: { line: 2, column: 2 },
    source: 'bar.js'
  });
  smg.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 1, column: 1 },
    source: 'baz.js'
  });

  const map = SourceMapConsumer.fromSourceMap(smg);

  // When finding original positions, mappings end at the end of the line.
  assertMapping(2, 1, null, null, null, null, null, map, true)

  // When finding generated positions, mappings do not end at the end of the line.
  assertMapping(1, 1, 'bar.js', 2, 1, null, null, map, null, true);

  // When finding generated positions with, mappings end at the end of the source.
  assertMapping(null, null, 'bar.js', 3, 1, null, SourceMapConsumer.LEAST_UPPER_BOUND, map, null, true);
});

it('test creating source map consumers with )]}\' prefix', () => {
  doesNotThrow(function () {
    new SourceMapConsumer(")]}'\n" + JSON.stringify(testMap));
  });
});

// FIXME: split into separate tests
it('test eachMapping', () => {
  let map;

  map = new SourceMapConsumer(testMap);
  let previousLine = -Infinity;
  let previousColumn = -Infinity;
  map.eachMapping((mapping) => {
    ok(mapping.generatedLine >= previousLine);

    ok(mapping.source === '/the/root/one.js' || mapping.source === '/the/root/two.js');

    if (mapping.generatedLine === previousLine) {
      ok(mapping.generatedColumn >= previousColumn);
      previousColumn = mapping.generatedColumn;
    }
    else {
      previousLine = mapping.generatedLine;
      previousColumn = -Infinity;
    }
  });

  map = new SourceMapConsumer(testMapNoSourceRoot);
  map.eachMapping((mapping) => {
    ok(mapping.source === 'one.js' || mapping.source === 'two.js');
  });

  map = new SourceMapConsumer(testMapEmptySourceRoot);
  map.eachMapping((mapping) => {
    ok(mapping.source === 'one.js' || mapping.source === 'two.js');
  });
});

it('test eachMapping for indexed source maps', () => {
  const map = new SourceMapConsumer(indexedTestMap);
  let previousLine = -Infinity;
  let previousColumn = -Infinity;
  map.eachMapping((mapping) => {
    ok(mapping.generatedLine >= previousLine);

    if (mapping.source) {
      equal(mapping.source.indexOf(testMap.sourceRoot), 0);
    }

    if (mapping.generatedLine === previousLine) {
      ok(mapping.generatedColumn >= previousColumn);
      previousColumn = mapping.generatedColumn;
    }
    else {
      previousLine = mapping.generatedLine;
      previousColumn = -Infinity;
    }
  });
});


it('test iterating over mappings in a different order', () => {
  const map = new SourceMapConsumer(testMap);
  let previousLine = -Infinity;
  let previousColumn = -Infinity;
  let previousSource = "";
  map.eachMapping((mapping) => {
    ok(mapping.source >= previousSource);

    if (mapping.source === previousSource) {
      ok(mapping.originalLine >= previousLine);

      if (mapping.originalLine === previousLine) {
        ok(mapping.originalColumn >= previousColumn);
        previousColumn = mapping.originalColumn;
      }
      else {
        previousLine = mapping.originalLine;
        previousColumn = -Infinity;
      }
    }
    else {
      previousSource = mapping.source;
      previousLine = -Infinity;
      previousColumn = -Infinity;
    }
  }, null, SourceMapConsumer.ORIGINAL_ORDER);
});

it('test iterating over mappings in a different order in indexed source maps', () => {
  const map = new SourceMapConsumer(indexedTestMap);
  let previousLine = -Infinity;
  let previousColumn = -Infinity;
  let previousSource = "";
  map.eachMapping((mapping) => {
    ok(mapping.source >= previousSource);

    if (mapping.source === previousSource) {
      ok(mapping.originalLine >= previousLine);

      if (mapping.originalLine === previousLine) {
        ok(mapping.originalColumn >= previousColumn);
        previousColumn = mapping.originalColumn;
      }
      else {
        previousLine = mapping.originalLine;
        previousColumn = -Infinity;
      }
    }
    else {
      previousSource = mapping.source;
      previousLine = -Infinity;
      previousColumn = -Infinity;
    }
  }, null, SourceMapConsumer.ORIGINAL_ORDER);
});

it('test that we can set the context for `this` in eachMapping', () => {
  const map = new SourceMapConsumer(testMap);
  const context = {};
  map.eachMapping(function () {
    equal(this, context);
  }, context);
});

it('test that we can set the context for `this` in eachMapping in indexed source maps', () => {
  const map = new SourceMapConsumer(indexedTestMap);
  const context = {};
  map.eachMapping(function () {
    equal(this, context);
  }, context);
});

it('test that the `sourcesContent` field has the original sources', () => {
  const map = new SourceMapConsumer(testMapWithSourcesContent);
  const sourcesContent = map.sourcesContent;

  equal(sourcesContent[0], ' ONE.foo = function (bar) {\n   return baz(bar);\n };');
  equal(sourcesContent[1], ' TWO.inc = function (n) {\n   return n + 1;\n };');
  equal(sourcesContent.length, 2);
});

it('test that we can get the original sources for the sources', () => {
  const map = new SourceMapConsumer(testMapWithSourcesContent);
  const sources = map.sources;

  equal(map.sourceContentFor(sources[0]), ' ONE.foo = function (bar) {\n   return baz(bar);\n };');
  equal(map.sourceContentFor(sources[1]), ' TWO.inc = function (n) {\n   return n + 1;\n };');
  equal(map.sourceContentFor("one.js"), ' ONE.foo = function (bar) {\n   return baz(bar);\n };');
  equal(map.sourceContentFor("two.js"), ' TWO.inc = function (n) {\n   return n + 1;\n };');
  throws(() => {
    map.sourceContentFor("");
  }, Error);
  throws(() => {
    map.sourceContentFor("/the/root/three.js");
  }, Error);
  throws(() => {
    map.sourceContentFor("three.js");
  }, Error);
});

it('test that we can get the original source content with relative source paths', () => {
  const map = new SourceMapConsumer(testMapRelativeSources);
  const sources = map.sources;

  equal(map.sourceContentFor(sources[0]), ' ONE.foo = function (bar) {\n   return baz(bar);\n };');
  equal(map.sourceContentFor(sources[1]), ' TWO.inc = function (n) {\n   return n + 1;\n };');
  equal(map.sourceContentFor("one.js"), ' ONE.foo = function (bar) {\n   return baz(bar);\n };');
  equal(map.sourceContentFor("two.js"), ' TWO.inc = function (n) {\n   return n + 1;\n };');
  throws(() => {
    map.sourceContentFor("");
  }, Error);
  throws(() => {
    map.sourceContentFor("/the/root/three.js");
  }, Error);
  throws(() => {
    map.sourceContentFor("three.js");
  }, Error);
});

it('test that we can get the original source content for the sources on an indexed source map', () => {
  const map = new SourceMapConsumer(indexedTestMap);
  const sources = map.sources;

  equal(map.sourceContentFor(sources[0]), ' ONE.foo = function (bar) {\n   return baz(bar);\n };');
  equal(map.sourceContentFor(sources[1]), ' TWO.inc = function (n) {\n   return n + 1;\n };');
  equal(map.sourceContentFor("one.js"), ' ONE.foo = function (bar) {\n   return baz(bar);\n };');
  equal(map.sourceContentFor("two.js"), ' TWO.inc = function (n) {\n   return n + 1;\n };');
  throws(() => {
    map.sourceContentFor("");
  }, Error);
  throws(() => {
    map.sourceContentFor("/the/root/three.js");
  }, Error);
  throws(() => {
    map.sourceContentFor("three.js");
  }, Error);
});

it('test hasContentsOfAllSources, single source with contents', () => {
  // Has one source: foo.js (with contents).
  const mapWithContents = new SourceMapGenerator();
  mapWithContents.addMapping({
    source: 'foo.js',
    original: { line: 1, column: 10 },
    generated: { line: 1, column: 10 }
  });
  mapWithContents.setSourceContent('foo.js', 'content of foo.js');
  const consumer = new SourceMapConsumer(mapWithContents.toJSON());
  ok(consumer.hasContentsOfAllSources());
});

it('test hasContentsOfAllSources, single source without contents', () => {
  // Has one source: foo.js (without contents).
  const mapWithoutContents = new SourceMapGenerator();
  mapWithoutContents.addMapping({
    source: 'foo.js',
    original: { line: 1, column: 10 },
    generated: { line: 1, column: 10 }
  });
  const consumer = new SourceMapConsumer(mapWithoutContents.toJSON());
  ok(!consumer.hasContentsOfAllSources());
});

it('test hasContentsOfAllSources, two sources with contents', () => {
  // Has two sources: foo.js (with contents) and bar.js (with contents).
  const mapWithBothContents = new SourceMapGenerator();
  mapWithBothContents.addMapping({
    source: 'foo.js',
    original: { line: 1, column: 10 },
    generated: { line: 1, column: 10 }
  });
  mapWithBothContents.addMapping({
    source: 'bar.js',
    original: { line: 1, column: 10 },
    generated: { line: 1, column: 10 }
  });
  mapWithBothContents.setSourceContent('foo.js', 'content of foo.js');
  mapWithBothContents.setSourceContent('bar.js', 'content of bar.js');
  const consumer = new SourceMapConsumer(mapWithBothContents.toJSON());
  ok(consumer.hasContentsOfAllSources());
});

it('test hasContentsOfAllSources, two sources one with and one without contents', () => {
  // Has two sources: foo.js (with contents) and bar.js (without contents).
  const mapWithoutSomeContents = new SourceMapGenerator();
  mapWithoutSomeContents.addMapping({
    source: 'foo.js',
    original: { line: 1, column: 10 },
    generated: { line: 1, column: 10 }
  });
  mapWithoutSomeContents.addMapping({
    source: 'bar.js',
    original: { line: 1, column: 10 },
    generated: { line: 1, column: 10 }
  });
  mapWithoutSomeContents.setSourceContent('foo.js', 'content of foo.js');
  const consumer = new SourceMapConsumer(mapWithoutSomeContents.toJSON());
  ok(!consumer.hasContentsOfAllSources());
});

describe('test sourceRoot + generatedPositionFor', () => {
  let map;

  before(() => {
    map = new SourceMapGenerator({
      sourceRoot: 'foo/bar',
      file: 'baz.js'
    });
    map.addMapping({
      original: { line: 1, column: 1 },
      generated: { line: 2, column: 2 },
      source: 'bang.coffee'
    });
    map.addMapping({
      original: { line: 5, column: 5 },
      generated: { line: 6, column: 6 },
      source: 'bang.coffee'
    });
    map = new SourceMapConsumer(map.toString(), 'http://example.com/');
  });

  it('should handle without sourceRoot', () => {
    const pos = map.generatedPositionFor({
      line: 1,
      column: 1,
      source: 'bang.coffee'
    });

    equal(pos.line, 2);
    equal(pos.column, 2);
  });

  it('should handle with sourceRoot', () => {
    const pos = map.generatedPositionFor({
      line: 1,
      column: 1,
      source: 'foo/bar/bang.coffee'
    });

    equal(pos.line, 2);
    equal(pos.column, 2);
  });

  it('should handle absolute case', () => {
    const pos = map.generatedPositionFor({
      line: 1,
      column: 1,
      source: 'http://example.com/foo/bar/bang.coffee'
    });

    equal(pos.line, 2);
    equal(pos.column, 2);
  });
});

it('test sourceRoot + generatedPositionFor for path above the root', () => {
  let map = new SourceMapGenerator({
    sourceRoot: 'foo/bar',
    file: 'baz.js'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 2, column: 2 },
    source: '../bang.coffee'
  });
  map = new SourceMapConsumer(map.toString());

  // Should handle with sourceRoot.
  const pos = map.generatedPositionFor({
    line: 1,
    column: 1,
    source: 'foo/bang.coffee'
  });

  equal(pos.line, 2);
  equal(pos.column, 2);
});

describe('test allGeneratedPositionsFor for line', () => {
  let map;
  before(() => {
    map = new SourceMapGenerator({
      file: 'generated.js'
    });
    map.addMapping({
      original: { line: 1, column: 1 },
      generated: { line: 2, column: 2 },
      source: 'foo.coffee'
    });
    map.addMapping({
      original: { line: 1, column: 1 },
      generated: { line: 2, column: 2 },
      source: 'bar.coffee'
    });
    map.addMapping({
      original: { line: 2, column: 1 },
      generated: { line: 3, column: 2 },
      source: 'bar.coffee'
    });
    map.addMapping({
      original: { line: 2, column: 2 },
      generated: { line: 3, column: 3 },
      source: 'bar.coffee'
    });
    map.addMapping({
      original: { line: 3, column: 1 },
      generated: { line: 4, column: 2 },
      source: 'bar.coffee'
    });
    map = new SourceMapConsumer(map.toString(), 'http://example.com/');
  });

  it('#1', () => {
    const mappings = map.allGeneratedPositionsFor({
      line: 2,
      source: 'bar.coffee'
    });

    equal(mappings.length, 2);
    equal(mappings[0].line, 3);
    equal(mappings[0].column, 2);
    equal(mappings[1].line, 3);
    equal(mappings[1].column, 3);
  });

  it('#2', () => {
    const mappings = map.allGeneratedPositionsFor({
      line: 2,
      source: 'http://example.com/bar.coffee'
    });

    equal(mappings.length, 2);
    equal(mappings[0].line, 3);
    equal(mappings[0].column, 2);
    equal(mappings[1].line, 3);
    equal(mappings[1].column, 3);
  });
});

it('test allGeneratedPositionsFor for line fuzzy', () => {
  let map = new SourceMapGenerator({
    file: 'generated.js'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 2, column: 2 },
    source: 'foo.coffee'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 2, column: 2 },
    source: 'bar.coffee'
  });
  map.addMapping({
    original: { line: 3, column: 1 },
    generated: { line: 4, column: 2 },
    source: 'bar.coffee'
  });
  map = new SourceMapConsumer(map.toString());

  const mappings = map.allGeneratedPositionsFor({
    line: 2,
    source: 'bar.coffee'
  });

  equal(mappings.length, 1);
  equal(mappings[0].line, 4);
  equal(mappings[0].column, 2);
});

it('test allGeneratedPositionsFor for empty source map', () => {
  let map = new SourceMapGenerator({
    file: 'generated.js'
  });
  map = new SourceMapConsumer(map.toString());

  const mappings = map.allGeneratedPositionsFor({
    line: 2,
    source: 'bar.coffee'
  });

  equal(mappings.length, 0);
});

it('test allGeneratedPositionsFor for column', () => {
  let map = new SourceMapGenerator({
    file: 'generated.js'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 1, column: 2 },
    source: 'foo.coffee'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 1, column: 3 },
    source: 'foo.coffee'
  });
  map = new SourceMapConsumer(map.toString());

  const mappings = map.allGeneratedPositionsFor({
    line: 1,
    column: 1,
    source: 'foo.coffee'
  });

  equal(mappings.length, 2);
  equal(mappings[0].line, 1);
  equal(mappings[0].column, 2);
  equal(mappings[1].line, 1);
  equal(mappings[1].column, 3);
});

it('test allGeneratedPositionsFor for column fuzzy', () => {
  let map = new SourceMapGenerator({
    file: 'generated.js'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 1, column: 2 },
    source: 'foo.coffee'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 1, column: 3 },
    source: 'foo.coffee'
  });
  map = new SourceMapConsumer(map.toString());

  const mappings = map.allGeneratedPositionsFor({
    line: 1,
    column: 0,
    source: 'foo.coffee'
  });

  equal(mappings.length, 2);
  equal(mappings[0].line, 1);
  equal(mappings[0].column, 2);
  equal(mappings[1].line, 1);
  equal(mappings[1].column, 3);
});

it('test allGeneratedPositionsFor for column on different line fuzzy', () => {
  let map = new SourceMapGenerator({
    file: 'generated.js'
  });
  map.addMapping({
    original: { line: 2, column: 1 },
    generated: { line: 2, column: 2 },
    source: 'foo.coffee'
  });
  map.addMapping({
    original: { line: 2, column: 1 },
    generated: { line: 2, column: 3 },
    source: 'foo.coffee'
  });
  map = new SourceMapConsumer(map.toString());

  const mappings = map.allGeneratedPositionsFor({
    line: 1,
    column: 0,
    source: 'foo.coffee'
  });

  equal(mappings.length, 0);
});

describe('test computeColumnSpans', () => {
  let map;
  before(() => {
    map = new SourceMapGenerator({
      file: 'generated.js'
    });
    map.addMapping({
      original: { line: 1, column: 1 },
      generated: { line: 1, column: 1 },
      source: 'foo.coffee'
    });
    map.addMapping({
      original: { line: 2, column: 1 },
      generated: { line: 2, column: 1 },
      source: 'foo.coffee'
    });
    map.addMapping({
      original: { line: 2, column: 2 },
      generated: { line: 2, column: 10 },
      source: 'foo.coffee'
    });
    map.addMapping({
      original: { line: 2, column: 3 },
      generated: { line: 2, column: 20 },
      source: 'foo.coffee'
    });
    map.addMapping({
      original: { line: 3, column: 1 },
      generated: { line: 3, column: 1 },
      source: 'foo.coffee'
    });
    map.addMapping({
      original: { line: 3, column: 2 },
      generated: { line: 3, column: 2 },
      source: 'foo.coffee'
    });
    map = new SourceMapConsumer(map.toString());
    map.computeColumnSpans();
  });

  it('#1', () => {
    const mappings = map.allGeneratedPositionsFor({
      line: 1,
      source: 'foo.coffee'
    });

    equal(mappings.length, 1);
    equal(mappings[0].lastColumn, Infinity);
  });

  it('#2', () => {
    const mappings = map.allGeneratedPositionsFor({
      line: 2,
      source: 'foo.coffee'
    });

    equal(mappings.length, 3);
    equal(mappings[0].lastColumn, 9);
    equal(mappings[1].lastColumn, 19);
    equal(mappings[2].lastColumn, Infinity);
  });

  it('#3', () => {
    const mappings = map.allGeneratedPositionsFor({
      line: 3,
      source: 'foo.coffee'
    });

    equal(mappings.length, 2);
    equal(mappings[0].lastColumn, 1);
    equal(mappings[1].lastColumn, Infinity);
  });
});

it('test sourceRoot + originalPositionFor', () => {
  let map = new SourceMapGenerator({
    sourceRoot: 'foo/bar',
    file: 'baz.js'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 2, column: 2 },
    source: 'bang.coffee'
  });
  map = new SourceMapConsumer(map.toString());

  const pos = map.originalPositionFor({
    line: 2,
    column: 2,
  });

  // Should always have the prepended source root
  equal(pos.source, 'foo/bar/bang.coffee');
  equal(pos.line, 1);
  equal(pos.column, 1);
});

it('test github issue #56', () => {
  let map = new SourceMapGenerator({
    sourceRoot: 'http://',
    file: 'www.example.com/foo.js'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 2, column: 2 },
    source: 'www.example.com/original.js'
  });
  map = new SourceMapConsumer(map.toString());

  const sources = map.sources;
  equal(sources.length, 1);
  equal(sources[0], 'http://www.example.com/original.js');
});

// Was github issue #43, but that's no longer valid.
it('test source resolution with sourceMapURL', () => {
  let map = new SourceMapGenerator({
    sourceRoot: '',
    file: 'foo.js'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 2, column: 2 },
    source: 'original.js',
  });
  map = new SourceMapConsumer(map.toString(), 'http://cdn.example.com');

  const sources = map.sources;
  equal(sources.length, 1,
    'Should only be one source.');
  equal(sources[0], 'http://cdn.example.com/original.js',
    'Should be joined with the source map URL.');
});

it('test sourceRoot prepending', () => {
  let map = new SourceMapGenerator({
    sourceRoot: 'http://example.com/foo/bar',
    file: 'foo.js'
  });
  map.addMapping({
    original: { line: 1, column: 1 },
    generated: { line: 2, column: 2 },
    source: '/original.js'
  });
  map = new SourceMapConsumer(map.toString());

  const sources = map.sources;
  equal(sources.length, 1,
    'Should only be one source.');
  equal(sources[0], 'http://example.com/foo/bar/original.js',
    'Source include the source root.');
});

it('test indexed source map errors when sections are out of order by line', () => {
  // Make a deep copy of the indexedTestMap
  const misorderedIndexedTestMap = JSON.parse(JSON.stringify(indexedTestMap));

  misorderedIndexedTestMap.sections[0].offset = {
    line: 2,
    column: 0
  };

  throws(() => {
    new SourceMapConsumer(misorderedIndexedTestMap);
  }, Error);
});

it('test github issue #64', () => {
  const map = new SourceMapConsumer({
    "version": 3,
    "file": "foo.js",
    "sourceRoot": "http://example.com/",
    "sources": ["/a"],
    "names": [],
    "mappings": "AACA",
    "sourcesContent": ["foo"]
  });

  equal(map.sourceContentFor("a"), "foo");
  equal(map.sourceContentFor("/a"), "foo");
});

it('test full source content with sourceMapURL', () => {
  const map = new SourceMapConsumer({
    'version': 3,
    'file': 'foo.js',
    'sourceRoot': '',
    'sources': ['original.js'],
    'names': [],
    'mappings': 'AACA',
    'sourcesContent': ['yellow warbler']
  }, 'http://cdn.example.com');

  equal(map.sourceContentFor('http://cdn.example.com/original.js'), 'yellow warbler',
    'Source content should be found using full URL');
});

it('test bug 885597', () => {
  const map = new SourceMapConsumer({
    "version": 3,
    "file": "foo.js",
    "sourceRoot": "file:///Users/AlGore/Invented/The/Internet/",
    "sources": ["/a"],
    "names": [],
    "mappings": "AACA",
    "sourcesContent": ["foo"]
  });

  const source = map.sources[0];
  equal(map.sourceContentFor(source), "foo");
});

describe('test github issue #72, duplicate sources', () => {
  const map = new SourceMapConsumer({
    "version": 3,
    "file": "foo.js",
    "sources": ["source1.js", "source1.js", "source3.js"],
    "names": [],
    "mappings": ";EAAC;;IAEE;;MEEE",
    "sourceRoot": "http://example.com"
  });

  it('#1', () => {
    const pos = map.originalPositionFor({
      line: 2,
      column: 2
    });
    equal(pos.source, 'http://example.com/source1.js');
    equal(pos.line, 1);
    equal(pos.column, 1);
  });

  it('#2', () => {
    const pos = map.originalPositionFor({
      line: 4,
      column: 4
    });
    equal(pos.source, 'http://example.com/source1.js');
    equal(pos.line, 3);
    equal(pos.column, 3);
  });

  it('#3', () => {
    const pos = map.originalPositionFor({
      line: 6,
      column: 6
    });
    equal(pos.source, 'http://example.com/source3.js');
    equal(pos.line, 5);
    equal(pos.column, 5);
  });
});

describe('test github issue #72, duplicate names', () => {
  const map = new SourceMapConsumer({
    "version": 3,
    "file": "foo.js",
    "sources": ["source.js"],
    "names": ["name1", "name1", "name3"],
    "mappings": ";EAACA;;IAEEA;;MAEEE",
    "sourceRoot": "http://example.com"
  });

  it('#1', () => {
    const pos = map.originalPositionFor({
      line: 2,
      column: 2
    });
    equal(pos.name, 'name1');
    equal(pos.line, 1);
    equal(pos.column, 1);
  });

  it('#2', () => {
    const pos = map.originalPositionFor({
      line: 4,
      column: 4
    });
    equal(pos.name, 'name1');
    equal(pos.line, 3);
    equal(pos.column, 3);
  });

  it('#3', () => {
    const pos = map.originalPositionFor({
      line: 6,
      column: 6
    });
    equal(pos.name, 'name3');
    equal(pos.line, 5);
    equal(pos.column, 5);
  });
});

describe('test SourceMapConsumer.fromSourceMap', () => {
  let smc;
  before(() => {
    const smg = new SourceMapGenerator({
      sourceRoot: 'http://example.com/',
      file: 'foo.js'
    });
    smg.addMapping({
      original: { line: 1, column: 1 },
      generated: { line: 2, column: 2 },
      source: 'bar.js'
    });
    smg.addMapping({
      original: { line: 2, column: 2 },
      generated: { line: 4, column: 4 },
      source: 'baz.js',
      name: 'dirtMcGirt'
    });
    smg.setSourceContent('baz.js', 'baz.js content');

    smc = SourceMapConsumer.fromSourceMap(smg);
  });

  it('test map', () => {
    equal(smc.file, 'foo.js');
    equal(smc.sourceRoot, 'http://example.com/');
    equal(smc.sources.length, 2);
    equal(smc.sources[0], 'http://example.com/bar.js');
    equal(smc.sources[1], 'http://example.com/baz.js');
    equal(smc.sourceContentFor('baz.js'), 'baz.js content');
  });

  it('', () => {
    const pos = smc.originalPositionFor({
      line: 2,
      column: 2
    });
    equal(pos.line, 1);
    equal(pos.column, 1);
    equal(pos.source, 'http://example.com/bar.js');
    equal(pos.name, null);
  });

  it('', () => {
    const pos = smc.generatedPositionFor({
      line: 1,
      column: 1,
      source: 'http://example.com/bar.js'
    });
    equal(pos.line, 2);
    equal(pos.column, 2);
  });

  it('', () => {
    const pos = smc.originalPositionFor({
      line: 4,
      column: 4
    });
    equal(pos.line, 2);
    equal(pos.column, 2);
    equal(pos.source, 'http://example.com/baz.js');
    equal(pos.name, 'dirtMcGirt');
  });

  it('', () => {
    const pos = smc.generatedPositionFor({
      line: 2,
      column: 2,
      source: 'http://example.com/baz.js'
    });
    equal(pos.line, 4);
    equal(pos.column, 4);
  });
});

it('test issue #191', () => {
  const generator = new SourceMapGenerator({ file: 'a.css' });
  generator.addMapping({
    source: 'b.css',
    original: {
      line: 1,
      column: 0
    },
    generated: {
      line: 1,
      column: 0
    }
  });

  // Create a SourceMapConsumer from the SourceMapGenerator, ...
  SourceMapConsumer.fromSourceMap(generator);
  // ... and then try and use the SourceMapGenerator again. This should not
  // throw.
  generator.toJSON();

  ok(true, "Using a SourceMapGenerator again after creating a " +
                  "SourceMapConsumer from it should not throw");
});

it('test sources where their prefix is the source root: issue #199', () => {
  const testSourceMap = {
    "version": 3,
    "sources": ["/source/app/app/app.js"],
    "names": ["System"],
    "mappings": "AAAAA",
    "file": "app/app.js",
    "sourcesContent": ["'use strict';"],
    "sourceRoot":"/source/"
  };

  const consumer = new SourceMapConsumer(testSourceMap);
  const consumerHasSource = (s) => {
    ok(consumer.sourceContentFor(s));
  };

  consumer.sources.forEach(consumerHasSource);
  testSourceMap.sources.forEach(consumerHasSource);
});

it('test sources where their prefix is the source root and the source root is a url: issue #199', () => {
  const testSourceMap = {
    "version": 3,
    "sources": ["http://example.com/source/app/app/app.js"],
    "names": ["System"],
    "mappings": "AAAAA",
    "sourcesContent": ["'use strict';"],
    "sourceRoot":"http://example.com/source/"
  };

  const consumer = new SourceMapConsumer(testSourceMap);
  const consumerHasSource = (s) => {
    ok(consumer.sourceContentFor(s));
  }

  consumer.sources.forEach(consumerHasSource);
  testSourceMap.sources.forEach(consumerHasSource);
});

it('test consuming names and sources that are numbers', () => {
  const testSourceMap = {
    "version": 3,
    "sources": [0],
    "names": [1],
    "mappings": "AAAAA",
  };

  const consumer = new SourceMapConsumer(testSourceMap);

  equal(consumer.sources.length, 1);
  equal(consumer.sources[0], "0");

  let i = 0;
  consumer.eachMapping((m) => {
    i++;
    equal(m.name, "1");
  });
  equal(i, 1);
});

it('test non-normalized sourceRoot (from issue #227)', () => {
  const consumer = new SourceMapConsumer({
    version: 3,
    sources: [ 'index.js' ],
    names: [],
    mappings: ';;AAAA,IAAI,OAAO,MAAP',
    file: 'index.js',
    sourceRoot: './src/',
    sourcesContent: [ 'var name = "Mark"\n' ]
  });
  equal(consumer.sourceRoot, 'src/', 'sourceRoot was normalized');
  // Before the fix, this threw an exception.
  consumer.sourceContentFor(consumer.sources[0]);
});

it('test webpack URL resolution', () => {
  const map = {
    version: 3,
    sources:  ["webpack:///webpack/bootstrap 67e184f9679733298d44"],
    names: [],
    mappings: "CAAS",
    file: "static/js/manifest.b7cf97680f7a50fa150f.js",
    sourceRoot: ""
  };
  const consumer = new SourceMapConsumer(map);

  equal(consumer.sources.length, 1);
  equal(consumer.sources[0], "webpack:///webpack/bootstrap 67e184f9679733298d44");
});

it('test webpack URL resolution with sourceMapURL', () => {
  const map = {
    version: 3,
    sources:  ["webpack:///webpack/bootstrap 67e184f9679733298d44"],
    names: [],
    mappings: "CAAS",
    file: "static/js/manifest.b7cf97680f7a50fa150f.js",
    sourceRoot: ""
  };
  const consumer = new SourceMapConsumer(map, 'http://www.example.com/q.js.map');

  equal(consumer.sources.length, 1);
  equal(consumer.sources[0], "webpack:///webpack/bootstrap 67e184f9679733298d44");
});

it('test relative webpack URL resolution with sourceMapURL', () => {
  const map = {
    version: 3,
    sources:  ["webpack/bootstrap.js"],
    names: [],
    mappings: "CAAS",
    file: "static/js/manifest.b7cf97680f7a50fa150f.js",
    sourceRoot: "webpack:///"
  };
  const consumer = new SourceMapConsumer(map, 'http://www.example.com/q.js.map');

  equal(consumer.sources.length, 1);
  equal(consumer.sources[0], "webpack:///webpack/bootstrap.js");
});

it('test basic URL resolution with sourceMapURL', () => {
  const map = {
    version: 3,
    sources:  ["something.js"],
    names: [],
    mappings: "CAAS",
    file: "static/js/manifest.b7cf97680f7a50fa150f.js",
    sourceRoot: "src"
  };
  const consumer = new SourceMapConsumer(map, 'http://www.example.com/x/q.js.map');

  equal(consumer.sources.length, 1);
  equal(consumer.sources[0], 'http://www.example.com/x/src/something.js');
});

it('test absolute sourceURL resolution with sourceMapURL', () => {
  const map = {
    version: 3,
    sources:  ["something.js"],
    names: [],
    mappings: "CAAS",
    file: "static/js/manifest.b7cf97680f7a50fa150f.js",
    sourceRoot: "http://www.example.com/src"
  };
  const consumer = new SourceMapConsumer(map, 'http://www.example.com/x/q.js.map');

  equal(consumer.sources.length, 1);
  equal(consumer.sources[0], 'http://www.example.com/src/something.js');
});
