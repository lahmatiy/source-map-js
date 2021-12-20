import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import esMain from 'es-main';
import * as self from '../lib/index.js';
import sourceMapJS from 'source-map-js';
import sourceMapV6 from 'source-map-v6';
import sourceMapV7 from 'source-map-v7';
import sourceMapNext from 'source-map-next';
import { runBenchmark, prettySize, outputToReadme, updateReadmeTable } from './utils/benchmark-utils.js';

const benchmarkName = 'generate-source-map';
const fixtures = [
    './fixtures/self.json',           // ~257Kb
    './fixtures/angular-min.json',    // ~430Kb
    './fixtures/scalajs-runtime.json' // ~16Mb
];
const fixtureIndex = process.argv[2] || 0;
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const filename = fixtureIndex in fixtures ? path.join(__dirname, fixtures[fixtureIndex]) : false;

if (!filename) {
    console.error('Fixture is not selected!');
    console.error();
    console.error('Run script:', chalk.green(`node ${path.relative(process.cwd(), process.argv[1])} [fixture]`));
    console.error();
    console.error(`where ${chalk.yellow('[fixture]')} is a number:`);
    fixtures.forEach((fixture, idx) =>
        console.log(idx, fixture)
    );
    process.exit();
}

const libFactory = (lib) => {
    return async (data) => {
        const generator = new lib.SourceMapGenerator();

        for (const mapping of data) {
            generator.addMapping(mapping);
        }
        
        generator.toString();
        // console.log();
    }
};

export const tests = {
    'Current': libFactory(self),
    'source-map-js v1.0': libFactory(sourceMapJS),
    'source-map v0.6': libFactory(sourceMapV6),
    'source-map v0.7': libFactory(sourceMapV7),
    'source-map next': libFactory(sourceMapNext)
};

Object.defineProperty(tests, '__getData', {
    value: () => {
        const data = JSON.parse(fs.readFileSync(filename));
        const consumer = new self.SourceMapConsumer(data);
        const mappings = [];

        consumer.eachMapping((mapping) => { 
            if (typeof mapping.originalLine !== 'number') {
                // console.log(mapping);
                return;
            }

            mappings.push({
                source: mapping.source,
                name: mapping.name || null,
                generated: { line: mapping.generatedLine, column: mapping.generatedColumn },
                original: { line: mapping.originalLine, column: mapping.originalColumn }
            })
        });

        return mappings;
    }
});

if (esMain(import.meta)) {
    run();
}

//
// Run benchmarks
//
async function run() {
    if (!fs.existsSync(filename)) {
        // auto-generate fixture
        let [, num, unit] = filename.match(/(\d+)([a-z]+).json/);
        const times = unit === 'mb' ? num / 100 : num * 10;

        await require('./gen-fixture')(times, filename);
    }

    if (process.env.README) {
        outputToReadme(benchmarkName, fixtureIndex);
    }

    console.log('Benchmark:', chalk.green('new SourceMapGenerator()'));
    console.log('Node version:', chalk.green(process.versions.node));
    console.log('Fixture:',
        chalk.green(path.relative(process.cwd(), filename)),
        chalk.yellow(prettySize(fs.statSync(filename).size))
    );
    console.log();

    const results = [];
    for (const name of Object.keys(tests)) {
        results.push(await runBenchmark(import.meta.url, name));
    }

    if (process.env.README) {
        updateReadmeTable(benchmarkName, fixtureIndex, fixtures, results);
    }
}