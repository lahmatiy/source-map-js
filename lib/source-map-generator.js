const base64VLQ = require('./base64-vlq');
const util = require('./util');
const { ArraySet } = require('./array-set');
const { MappingList } = require('./mapping-list');

const { hasOwnProperty } = Object.prototype;

/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */
class SourceMapGenerator {
  constructor(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }

    this._version = 3;
    this._file = util.getArg(aArgs, 'file', null);
    this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
    this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
    this._sources = new ArraySet();
    this._names = new ArraySet();
    this._mappings = new MappingList();
    this._sourcesContents = null;
  }

  /**
   * Creates a new SourceMapGenerator based on a SourceMapConsumer
   *
   * @param sourceMapConsumer The SourceMap.
   */
  static fromSourceMap(sourceMapConsumer) {
    const { sourceRoot } = sourceMapConsumer;
    const generator = new SourceMapGenerator({
      file: sourceMapConsumer.file,
      sourceRoot
    });

    sourceMapConsumer.eachMapping((mapping) => {
      const newMapping = {  // TODO: reuse?
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };

      if (mapping.source != null) {
        newMapping.source = mapping.source;

        if (sourceRoot != null) {
          newMapping.source = util.relative(sourceRoot, newMapping.source);
        }

        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };

        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }

      generator.addMapping(newMapping);
    });

    sourceMapConsumer.sources.forEach((sourceFile) => {
      const content = sourceMapConsumer.sourceContentFor(sourceFile);
      let sourceRelative = sourceFile;

      if (sourceRoot !== null) {
        sourceRelative = util.relative(sourceRoot, sourceFile);
      }

      if (!generator._sources.has(sourceRelative)) {
        generator._sources.add(sourceRelative);
      }

      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });

    return generator;
  }

  /**
   * Add a single mapping from original source line and column to the generated
   * source's line and column for this source map being created. The mapping
   * object should have the following properties:
   *
   *   - generated: An object with the generated line and column positions.
   *   - original: An object with the original line and column positions.
   *   - source: The original source file (relative to the sourceRoot).
   *   - name: An optional original token name for this mapping.
   */
  addMapping(args) {
    const generated = util.getArg(args, 'generated');
    const original = util.getArg(args, 'original', null);
    let source = util.getArg(args, 'source', null);
    let name = util.getArg(args, 'name', null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source,
      name
    });
  }

  /**
   * Set the source content for a source file.
   */
  setSourceContent(sourceFile, sourceContent) {
    if (this._sourceRoot != null) {
      sourceFile = util.relative(this._sourceRoot, sourceFile);
    }

    if (sourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }

      this._sourcesContents[sourceFile] = sourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[sourceFile];

      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  }

  /**
   * Applies the mappings of a sub-source-map for a specific source file to the
   * source map being generated. Each mapping to the supplied source file is
   * rewritten using the supplied source map. Note: The resolution for the
   * resulting mappings is the minimium of this map and the supplied map.
   *
   * @param sourceMapConsumer The source map to be applied.
   * @param sourceFile Optional. The filename of the source file.
   *        If omitted, SourceMapConsumer's file property will be used.
   * @param sourceMapPath Optional. The dirname of the path to the source map
   *        to be applied. If relative, it is relative to the SourceMapConsumer.
   *        This parameter is needed when the two source maps aren't in the same
   *        directory, and the source map to be applied contains relative source
   *        paths. If so, those relative source paths need to be rewritten
   *        relative to the SourceMapGenerator.
   */
  applySourceMap(sourceMapConsumer, sourceFile, sourceMapPath) {
    // If sourceFile is omitted, we will use the file property of the SourceMap
    if (sourceFile == null) {
      if (sourceMapConsumer.file == null) {
        throw new Error(
          'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
          'or the source map\'s "file" property. Both were omitted.'
        );
      }
      sourceFile = sourceMapConsumer.file;
    }

    const sourceRoot = this._sourceRoot;
    // Make "sourceFile" relative if an absolute Url is passed.
    if (sourceRoot != null) {
      sourceFile = util.relative(sourceRoot, sourceFile);
    }

    // Applying the SourceMap can add and remove items from the sources and
    // the names array.
    const newSources = new ArraySet();
    const newNames = new ArraySet();

    // Find mappings for the "sourceFile"
    this._mappings.unsortedForEach((mapping) => {
      if (mapping.source === sourceFile && mapping.originalLine !== null) {
        // Check if it can be mapped by the source map, then update the mapping.
        const original = sourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source !== null) {
          // Copy mapping
          mapping.source = original.source;
          if (sourceMapPath != null) {
            mapping.source = util.join(sourceMapPath, mapping.source)
          }
          if (sourceRoot != null) {
            mapping.source = util.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name !== null) {
            mapping.name = original.name;
          }
        }
      }

      const source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }

      const name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }
    });

    this._sources = newSources;
    this._names = newNames;

    // Copy sourcesContents of applied map.
    sourceMapConsumer.sources.forEach((sourceFile) => {
      const content = sourceMapConsumer.sourceContentFor(sourceFile);

      if (content != null) {
        if (sourceMapPath != null) {
          sourceFile = util.join(sourceMapPath, sourceFile);
        }

        if (sourceRoot != null) {
          sourceFile = util.relative(sourceRoot, sourceFile);
        }

        this.setSourceContent(sourceFile, content);
      }
    });
  }

  /**
   * A mapping can have one of the three levels of data:
   *
   *   1. Just the generated position.
   *   2. The Generated position, original position, and original source.
   *   3. Generated and original position, original source, as well as a name
   *      token.
   *
   * To maintain consistency, we validate that any new mapping being added falls
   * in to one of these categories.
   */
  _validateMapping(generated, original, source, name) {
    // When original is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (original && typeof original.line !== 'number' && typeof original.column !== 'number') {
        throw new Error(
            'original.line and original.column are not numbers -- you probably meant to omit ' +
            'the original mapping entirely and only map the generated position. If so, pass ' +
            'null for the original mapping instead of an object with empty or null values.'
        );
    }

    if (
      generated &&
      'line' in generated &&
      'column' in generated &&
      generated.line > 0 &&
      generated.column >= 0
    ) {
      // Case 1.
      if (
        !original &&
        !source &&
        !name
      ) {
        return;
      }

      // Cases 2 and 3.
      if (
        original &&
        'line' in original &&
        'column' in original &&
        original.line > 0 &&
        original.column >= 0 &&
        source
      ) {
        return;
      }
    }

    throw new Error('Invalid mapping: ' + JSON.stringify({
      generated,
      source,
      original,
      name
    }));
  }

  /**
   * Serialize the accumulated mappings in to the stream of base 64 VLQs
   * specified by the source map format.
   */
  _serializeMappings() {
    let previousGeneratedColumn = 0;
    let previousGeneratedLine = 1;
    let previousOriginalColumn = 0;
    let previousOriginalLine = 0;
    let previousName = 0;
    let previousSource = 0;
    let result = '';
    let next;
    let mapping;
    let nameIdx;
    let sourceIdx;

    const mappings = this._mappings.toArray();
    for (let i = 0; i < mappings.length; i++) {
      mapping = mappings[i];
      next = '';

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ';';
          previousGeneratedLine++;
        }
      }
      else {
        if (i > 0) {
          if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
            continue;
          }
          next += ',';
        }
      }

      next += base64VLQ.encode(
        mapping.generatedColumn - previousGeneratedColumn
      );
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64VLQ.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += base64VLQ.encode(
          mapping.originalLine - 1 - previousOriginalLine
        );
        previousOriginalLine = mapping.originalLine - 1;

        next += base64VLQ.encode(
          mapping.originalColumn - previousOriginalColumn
        );
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64VLQ.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  }

  _generateSourcesContent(sources, sourceRoot) {
    return sources.map((source) => {
      if (!this._sourcesContents) {
        return null;
      }

      if (sourceRoot != null) {
        source = util.relative(sourceRoot, source);
      }

      return hasOwnProperty.call(this._sourcesContents, source)
        ? this._sourcesContents[source]
        : null;
    });
  }

  /**
   * Externalize the source map.
   */
  toJSON() {
    const map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };

    if (this._file != null) {
      map.file = this._file;
    }

    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }

    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }

    return map;
  }

  /**
   * Render the source map being generated to a string.
   */
  toString() {
    return JSON.stringify(this.toJSON());
  }
}

exports.SourceMapGenerator = SourceMapGenerator;
