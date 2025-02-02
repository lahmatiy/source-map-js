import { ok, equal, doesNotThrow, throws } from 'assert';
import { SourceMapGenerator, SourceMapConsumer } from 'source-map-js';
import {
  assertEqualMaps,
  testMap,
  testMapWithSourcesContent,
  testMapSingleSource,
  testMapEmptyMappings,
  testMapEmptyMappingsRelativeSources,
  testMapEmptyMappingsRelativeSources_generatedExpected,
  testMapMultiSourcesMappingRefersSingleSourceOnly
} from './util.js';

it('no options', () => {
  const map = new SourceMapGenerator().toJSON();
  ok(!('file' in map));
  ok(!('sourceRoot' in map));
});

it('test some simple stuff', () => {
  const map = new SourceMapGenerator({
    file: 'foo.js',
    sourceRoot: '.'
  }).toJSON();
  ok('file' in map);
  ok('sourceRoot' in map);
});

it('test JSON serialization', () => {
  const map = new SourceMapGenerator({
    file: 'foo.js',
    sourceRoot: '.'
  });
  equal(map.toString(), JSON.stringify(map));
});

it('test adding mappings (case 1)', () => {
  const map = new SourceMapGenerator({
    file: 'generated-foo.js',
    sourceRoot: '.'
  });

  doesNotThrow(() => {
    map.addMapping({
      generated: { line: 1, column: 1 }
    });
  });
});

it('test adding mappings (case 2)', () => {
  const map = new SourceMapGenerator({
    file: 'generated-foo.js',
    sourceRoot: '.'
  });

  doesNotThrow(() => {
    map.addMapping({
      generated: { line: 1, column: 1 },
      source: 'bar.js',
      original: { line: 1, column: 1 }
    });
  });
});

it('test adding mappings (case 3)', () => {
  const map = new SourceMapGenerator({
    file: 'generated-foo.js',
    sourceRoot: '.'
  });

  doesNotThrow(() => {
    map.addMapping({
      generated: { line: 1, column: 1 },
      source: 'bar.js',
      original: { line: 1, column: 1 },
      name: 'someToken'
    });
  });
});

it('test adding mappings (invalid)', () => {
  const map = new SourceMapGenerator({
    file: 'generated-foo.js',
    sourceRoot: '.'
  });

  // Not enough info.
  throws(() => {
    map.addMapping({});
  });

  // Original file position, but no source.
  throws(() => {
    map.addMapping({
      generated: { line: 1, column: 1 },
      original: { line: 1, column: 1 }
    });
  });
});

it('test adding mappings with skipValidation', () => {
  const map = new SourceMapGenerator({
    file: 'generated-foo.js',
    sourceRoot: '.',
    skipValidation: true
  });

  // Not enough info, caught by `util.getArgs`
  throws(function () {
    map.addMapping({});
  });

  // Original file position, but no source. Not checked.
  doesNotThrow(function () {
    map.addMapping({
      generated: { line: 1, column: 1 },
      original: { line: 1, column: 1 }
    });
  });
});

it('test that the correct mappings are being generated', () => {
  const map = new SourceMapGenerator({
    file: 'min.js',
    sourceRoot: '/the/root'
  });

  map.addMapping({
    generated: { line: 1, column: 1 },
    original: { line: 1, column: 1 },
    source: 'one.js'
  });
  map.addMapping({
    generated: { line: 1, column: 5 },
    original: { line: 1, column: 5 },
    source: 'one.js'
  });
  map.addMapping({
    generated: { line: 1, column: 9 },
    original: { line: 1, column: 11 },
    source: 'one.js'
  });
  map.addMapping({
    generated: { line: 1, column: 18 },
    original: { line: 1, column: 21 },
    source: 'one.js',
    name: 'bar'
  });
  map.addMapping({
    generated: { line: 1, column: 21 },
    original: { line: 2, column: 3 },
    source: 'one.js'
  });
  map.addMapping({
    generated: { line: 1, column: 28 },
    original: { line: 2, column: 10 },
    source: 'one.js',
    name: 'baz'
  });
  map.addMapping({
    generated: { line: 1, column: 32 },
    original: { line: 2, column: 14 },
    source: 'one.js',
    name: 'bar'
  });

  map.addMapping({
    generated: { line: 2, column: 1 },
    original: { line: 1, column: 1 },
    source: 'two.js'
  });
  map.addMapping({
    generated: { line: 2, column: 5 },
    original: { line: 1, column: 5 },
    source: 'two.js'
  });
  map.addMapping({
    generated: { line: 2, column: 9 },
    original: { line: 1, column: 11 },
    source: 'two.js'
  });
  map.addMapping({
    generated: { line: 2, column: 18 },
    original: { line: 1, column: 21 },
    source: 'two.js',
    name: 'n'
  });
  map.addMapping({
    generated: { line: 2, column: 21 },
    original: { line: 2, column: 3 },
    source: 'two.js'
  });
  map.addMapping({
    generated: { line: 2, column: 28 },
    original: { line: 2, column: 10 },
    source: 'two.js',
    name: 'n'
  });

  const roundTripMap = JSON.parse(map.toString());
  assertEqualMaps(roundTripMap, testMap);
});

it('test that adding a mapping with an empty string name does not break generation', () => {
  const map = new SourceMapGenerator({
    file: 'generated-foo.js',
    sourceRoot: '.'
  });

  map.addMapping({
    generated: { line: 1, column: 1 },
    source: 'bar.js',
    original: { line: 1, column: 1 },
    name: ''
  });

  doesNotThrow(function () {
    JSON.parse(map.toString());
  });
});

it('test that source content can be set', () => {
  const map = new SourceMapGenerator({
    file: 'min.js',
    sourceRoot: '/the/root'
  });
  map.addMapping({
    generated: { line: 1, column: 1 },
    original: { line: 1, column: 1 },
    source: 'one.js'
  });
  map.addMapping({
    generated: { line: 2, column: 1 },
    original: { line: 1, column: 1 },
    source: 'two.js'
  });
  map.setSourceContent('one.js', 'one file content');

  const roundTripMap = JSON.parse(map.toString());
  equal(roundTripMap.sources[0], 'one.js');
  equal(roundTripMap.sources[1], 'two.js');
  equal(roundTripMap.sourcesContent[0], 'one file content');
  equal(roundTripMap.sourcesContent[1], null);
});

it('test .fromSourceMap', () => {
  const map = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(testMap));
  assertEqualMaps(map.toJSON(), testMap);
});

it('test .fromSourceMap with sourcesContent', () => {
  const map = SourceMapGenerator.fromSourceMap(
    new SourceMapConsumer(testMapWithSourcesContent));
  assertEqualMaps(map.toJSON(), testMapWithSourcesContent);
});

it('test .fromSourceMap with single source', () => {
  const map = SourceMapGenerator.fromSourceMap(
      new SourceMapConsumer(testMapSingleSource));
  assertEqualMaps(map.toJSON(), testMapSingleSource);
});

it('test .fromSourceMap with empty mappings', () => {
  const map = SourceMapGenerator.fromSourceMap(
    new SourceMapConsumer(testMapEmptyMappings));
  assertEqualMaps(map.toJSON(), testMapEmptyMappings);
});

it('test .fromSourceMap with empty mappings and relative sources', () => {
  const map = SourceMapGenerator.fromSourceMap(
    new SourceMapConsumer(testMapEmptyMappingsRelativeSources));
  assertEqualMaps(map.toJSON(), testMapEmptyMappingsRelativeSources_generatedExpected);
});

it('test .fromSourceMap with multiple sources where mappings refers only to single source', () => {
  const map = SourceMapGenerator.fromSourceMap(
    new SourceMapConsumer(testMapMultiSourcesMappingRefersSingleSourceOnly));
  assertEqualMaps(map.toJSON(), testMapMultiSourcesMappingRefersSingleSourceOnly);
});

it('test applySourceMap', () => {
  const mapStep1 = {
    version: 3,
    sources: ['fileX', 'fileY'],
    names: [],
    mappings: 'AACA;;ACAA;;ADDA;;ACAA',
    file: 'fileA',
    sourcesContent: ['lineX1\nlineX2\n', null]
  };

  const mapStep2 = {
    version: 3,
    sources: ['fileA', 'fileB'],
    names: [],
    mappings: ';AAAA;AACA;AACA;AACA;ACHA;AACA',
    file: 'fileGen',
    sourcesContent: [null, 'lineB1\nlineB2\n']
  }

  const expectedMap = {
    version: 3,
    sources: [ 'fileX', 'fileA', 'fileY', 'fileB' ],
    names: [],
    mappings: ';AACA;ACAA;ACAA;ADEA;AEHA;AACA',
    file: 'fileGen',
    sourcesContent: [ 'lineX1\nlineX2\n', null, null, 'lineB1\nlineB2\n' ]
  }

  // apply source map "mapStep1" to "mapStep2"
  const generator = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(mapStep2));
  generator.applySourceMap(new SourceMapConsumer(mapStep1));
  const actualMap = generator.toJSON();

  assertEqualMaps(actualMap, expectedMap);
});

it('test applySourceMap throws when file is missing', () => {
  const map = new SourceMapGenerator({
    file: 'test.js'
  });
  const map2 = new SourceMapGenerator();
  throws(() => {
    map.applySourceMap(new SourceMapConsumer(map2.toJSON()));
  });
});

it('test the two additional parameters of applySourceMap', () => {
  // Assume the following directory structure:
  //
  // http://foo.org/
  //   bar.coffee
  //   app/
  //     coffee/
  //       foo.coffee
  //     temp/
  //       bundle.js
  //       temp_maps/
  //         bundle.js.map
  //     public/
  //       bundle.min.js
  //       bundle.min.js.map
  //
  // http://www.example.com/
  //   baz.coffee

  let bundleMap = new SourceMapGenerator({
    file: 'bundle.js'
  });
  bundleMap.addMapping({
    generated: { line: 3, column: 3 },
    original: { line: 2, column: 2 },
    source: '../../coffee/foo.coffee'
  });
  bundleMap.setSourceContent('../../coffee/foo.coffee', 'foo coffee');
  bundleMap.addMapping({
    generated: { line: 13, column: 13 },
    original: { line: 12, column: 12 },
    source: '/bar.coffee'
  });
  bundleMap.setSourceContent('/bar.coffee', 'bar coffee');
  bundleMap.addMapping({
    generated: { line: 23, column: 23 },
    original: { line: 22, column: 22 },
    source: 'http://www.example.com/baz.coffee'
  });
  bundleMap.setSourceContent(
    'http://www.example.com/baz.coffee',
    'baz coffee'
  );
  bundleMap = new SourceMapConsumer(bundleMap.toJSON());

  let minifiedMap = new SourceMapGenerator({
    file: 'bundle.min.js',
    sourceRoot: '..'
  });
  minifiedMap.addMapping({
    generated: { line: 1, column: 1 },
    original: { line: 3, column: 3 },
    source: 'temp/bundle.js'
  });
  minifiedMap.addMapping({
    generated: { line: 11, column: 11 },
    original: { line: 13, column: 13 },
    source: 'temp/bundle.js'
  });
  minifiedMap.addMapping({
    generated: { line: 21, column: 21 },
    original: { line: 23, column: 23 },
    source: 'temp/bundle.js'
  });
  minifiedMap = new SourceMapConsumer(minifiedMap.toJSON());

  const expectedMap = (sources) => {
    const map = new SourceMapGenerator({
      file: 'bundle.min.js',
      sourceRoot: '..'
    });
    map.addMapping({
      generated: { line: 1, column: 1 },
      original: { line: 2, column: 2 },
      source: sources[0]
    });
    map.setSourceContent(sources[0], 'foo coffee');
    map.addMapping({
      generated: { line: 11, column: 11 },
      original: { line: 12, column: 12 },
      source: sources[1]
    });
    map.setSourceContent(sources[1], 'bar coffee');
    map.addMapping({
      generated: { line: 21, column: 21 },
      original: { line: 22, column: 22 },
      source: sources[2]
    });
    map.setSourceContent(sources[2], 'baz coffee');
    return map.toJSON();
  }

  const actualMap = (aSourceMapPath) => {
    const map = SourceMapGenerator.fromSourceMap(minifiedMap);
    // Note that relying on `bundleMap.file` (which is simply 'bundle.js')
    // instead of supplying the second parameter wouldn't work here.
    map.applySourceMap(bundleMap, '../temp/bundle.js', aSourceMapPath);
    return map.toJSON();
  }

  assertEqualMaps(actualMap('../temp/temp_maps'), expectedMap([
    'coffee/foo.coffee',
    '/bar.coffee',
    'http://www.example.com/baz.coffee'
  ]));

  assertEqualMaps(actualMap('/app/temp/temp_maps'), expectedMap([
    '/app/coffee/foo.coffee',
    '/bar.coffee',
    'http://www.example.com/baz.coffee'
  ]));

  assertEqualMaps(actualMap('http://foo.org/app/temp/temp_maps'), expectedMap([
    'http://foo.org/app/coffee/foo.coffee',
    'http://foo.org/bar.coffee',
    'http://www.example.com/baz.coffee'
  ]));

  // If the third parameter is omitted or set to the current working
  // directory we get incorrect source paths:

  assertEqualMaps(actualMap(), expectedMap([
    '../coffee/foo.coffee',
    '/bar.coffee',
    'http://www.example.com/baz.coffee'
  ]));

  assertEqualMaps(actualMap(''), expectedMap([
    '../coffee/foo.coffee',
    '/bar.coffee',
    'http://www.example.com/baz.coffee'
  ]));

  assertEqualMaps(actualMap('.'), expectedMap([
    '../coffee/foo.coffee',
    '/bar.coffee',
    'http://www.example.com/baz.coffee'
  ]));

  assertEqualMaps(actualMap('./'), expectedMap([
    '../coffee/foo.coffee',
    '/bar.coffee',
    'http://www.example.com/baz.coffee'
  ]));
});

it('test applySourceMap name handling', () => {
  // Imagine some CoffeeScript code being compiled into JavaScript and then
  // minified.

  const assertName = (coffeeName, jsName, expectedName) => {
    const minifiedMap = new SourceMapGenerator({
      file: 'test.js.min'
    });
    minifiedMap.addMapping({
      generated: { line: 1, column: 4 },
      original: { line: 1, column: 4 },
      source: 'test.js',
      name: jsName
    });

    const coffeeMap = new SourceMapGenerator({
      file: 'test.js'
    });
    coffeeMap.addMapping({
      generated: { line: 1, column: 4 },
      original: { line: 1, column: 0 },
      source: 'test.coffee',
      name: coffeeName
    });

    minifiedMap.applySourceMap(new SourceMapConsumer(coffeeMap.toJSON()));

    new SourceMapConsumer(minifiedMap.toJSON()).eachMapping(function(mapping) {
      equal(mapping.name, expectedName);
    });
  };

  // `foo = 1` -> `var foo = 1;` -> `var a=1`
  // CoffeeScript doesn’t rename variables, so there’s no need for it to
  // provide names in its source maps. Minifiers do rename variables and
  // therefore do provide names in their source maps. So that name should be
  // retained if the original map lacks names.
  assertName(null, 'foo', 'foo');

  // `foo = 1` -> `var coffee$foo = 1;` -> `var a=1`
  // Imagine that CoffeeScript prefixed all variables with `coffee$`. Even
  // though the minifier then also provides a name, the original name is
  // what corresponds to the source.
  assertName('foo', 'coffee$foo', 'foo');

  // `foo = 1` -> `var coffee$foo = 1;` -> `var coffee$foo=1`
  // Minifiers can turn off variable mangling. Then there’s no need to
  // provide names in the source map, but the names from the original map are
  // still needed.
  assertName('foo', null, 'foo');

  // `foo = 1` -> `var foo = 1;` -> `var foo=1`
  // No renaming at all.
  assertName(null, null, null);
});

it('test sorting with duplicate generated mappings', () => {
  const map = new SourceMapGenerator({
    file: 'test.js'
  });
  map.addMapping({
    generated: { line: 3, column: 0 },
    original: { line: 2, column: 0 },
    source: 'a.js'
  });
  map.addMapping({
    generated: { line: 2, column: 0 }
  });
  map.addMapping({
    generated: { line: 2, column: 0 }
  });
  map.addMapping({
    generated: { line: 1, column: 0 },
    original: { line: 1, column: 0 },
    source: 'a.js'
  });

  assertEqualMaps(map.toJSON(), {
    version: 3,
    file: 'test.js',
    sources: ['a.js'],
    names: [],
    mappings: 'AAAA;A;AACA'
  });
});

it('test ignore duplicate mappings.', () => {
  const init = { file: 'min.js', sourceRoot: '/the/root' };
  let map1, map2;

  // null original source location
  const nullMapping1 = {
    generated: { line: 1, column: 0 }
  };
  const nullMapping2 = {
    generated: { line: 2, column: 2 }
  };

  map1 = new SourceMapGenerator(init);
  map2 = new SourceMapGenerator(init);

  map1.addMapping(nullMapping1);
  map1.addMapping(nullMapping1);

  map2.addMapping(nullMapping1);

  assertEqualMaps(map1.toJSON(), map2.toJSON());

  map1.addMapping(nullMapping2);
  map1.addMapping(nullMapping1);

  map2.addMapping(nullMapping2);

  assertEqualMaps(map1.toJSON(), map2.toJSON());

  // original source location
  const srcMapping1 = {
    generated: { line: 1, column: 0 },
    original: { line: 11, column: 0 },
    source: 'srcMapping1.js'
  };
  const srcMapping2 = {
    generated: { line: 2, column: 2 },
    original: { line: 11, column: 0 },
    source: 'srcMapping2.js'
  };

  map1 = new SourceMapGenerator(init);
  map2 = new SourceMapGenerator(init);

  map1.addMapping(srcMapping1);
  map1.addMapping(srcMapping1);

  map2.addMapping(srcMapping1);

  assertEqualMaps(map1.toJSON(), map2.toJSON());

  map1.addMapping(srcMapping2);
  map1.addMapping(srcMapping1);

  map2.addMapping(srcMapping2);

  assertEqualMaps(map1.toJSON(), map2.toJSON());

  // full original source and name information
  const fullMapping1 = {
    generated: { line: 1, column: 0 },
    original: { line: 11, column: 0 },
    source: 'fullMapping1.js',
    name: 'fullMapping1'
  };
  const fullMapping2 = {
    generated: { line: 2, column: 2 },
    original: { line: 11, column: 0 },
    source: 'fullMapping2.js',
    name: 'fullMapping2'
  };

  map1 = new SourceMapGenerator(init);
  map2 = new SourceMapGenerator(init);

  map1.addMapping(fullMapping1);
  map1.addMapping(fullMapping1);

  map2.addMapping(fullMapping1);

  assertEqualMaps(map1.toJSON(), map2.toJSON());

  map1.addMapping(fullMapping2);
  map1.addMapping(fullMapping1);

  map2.addMapping(fullMapping2);

  assertEqualMaps(map1.toJSON(), map2.toJSON());
});

it('test github issue #72, check for duplicate names or sources', () => {
  const map = new SourceMapGenerator({
    file: 'test.js'
  });
  map.addMapping({
    generated: { line: 1, column: 1 },
    original: { line: 2, column: 2 },
    source: 'a.js',
    name: 'foo'
  });
  map.addMapping({
    generated: { line: 3, column: 3 },
    original: { line: 4, column: 4 },
    source: 'a.js',
    name: 'foo'
  });
  assertEqualMaps(map.toJSON(), {
    version: 3,
    file: 'test.js',
    sources: ['a.js'],
    names: ['foo'],
    mappings: 'CACEA;;GAEEA'
  });
});

it('test setting sourcesContent to null when already null', () => {
  const smg = new SourceMapGenerator({ file: "foo.js" });
  doesNotThrow(() => {
    smg.setSourceContent("bar.js", null);
  });
});

it('test applySourceMap with unexact match', () => {
  const map1 = new SourceMapGenerator({
    file: 'bundled-source'
  });
  map1.addMapping({
    generated: { line: 1, column: 4 },
    original: { line: 1, column: 4 },
    source: 'transformed-source'
  });
  map1.addMapping({
    generated: { line: 2, column: 4 },
    original: { line: 2, column: 4 },
    source: 'transformed-source'
  });

  const map2 = new SourceMapGenerator({
    file: 'transformed-source'
  });
  map2.addMapping({
    generated: { line: 2, column: 0 },
    original: { line: 1, column: 0 },
    source: 'original-source'
  });

  const expectedMap = new SourceMapGenerator({
    file: 'bundled-source'
  });
  expectedMap.addMapping({
    generated: { line: 1, column: 4 },
    original: { line: 1, column: 4 },
    source: 'transformed-source'
  });
  expectedMap.addMapping({
    generated: { line: 2, column: 4 },
    original: { line: 1, column: 0 },
    source: 'original-source'
  });

  map1.applySourceMap(new SourceMapConsumer(map2.toJSON()));

  assertEqualMaps(map1.toJSON(), expectedMap.toJSON());
});

it('test issue #192', () => {
  const generator = new SourceMapGenerator();
  generator.addMapping({
    source: 'a.js',
    generated: { line: 1, column: 10 },
    original: { line: 1, column: 10 },
  });
  generator.addMapping({
    source: 'b.js',
    generated: { line: 1, column: 10 },
    original: { line: 2, column: 20 },
  });

  const consumer = new SourceMapConsumer(generator.toJSON());

  let n = 0;
  consumer.eachMapping(() => { n++ });

  equal(n, 2,
    "Should not de-duplicate mappings that have the same " +
    "generated positions, but different original positions.");
});

it('test numeric names #231', () => {
  const generator = new SourceMapGenerator();
  generator.addMapping({
    source: 'a.js',
    generated: { line: 1, column: 10 },
    original: { line: 1, column: 10 },
    name: 8
  });
  const map = generator.toJSON();
  ok(map, "Adding a mapping with a numeric name did not throw");
  equal(map.names.length, 1, "Should have one name");
  equal(map.names[0], "8", "Should have the right name");
});
