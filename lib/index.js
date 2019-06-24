const fg = require('fast-glob');
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');

const testsAPI = require('gemini/lib/tests-api');
const Suite = require('gemini/lib/suite');
const SuiteCollection = require('gemini/lib/suite-collection');
const Gemini = require('gemini/api');

const { parse: parseConfig, extendCli } = require('./config');
const proxy = require('./proxy');
const suiteUpdate = require('./suite-updater');
const fileGenerate = require('./file-generator');
const readOutputTests = require('./read-output-tests');
const copyScreenshots = require('./copy-screenshots');
const utils = require('./utils');

const cwd = process.cwd();

module.exports = (hermione, opts) => {
    hermione.on(hermione.events.CLI, extendCli);

    const config = parseConfig(opts);
    const {
        enabled,
        geminiConfigPath,
        inputPatterns,
        filePathReplacer,
        before,
        beforeEach,
        afterEach,
        after
    } = config;

    if (!enabled) return;

    hermione.on(hermione.events.AFTER_TESTS_READ, (testCollection) => {
        testCollection.disableAll();
    });

    if (hermione.isWorker()) return;

    hermione.once(hermione.events.INIT, async () => {
        const geminiAPI = new Gemini(geminiConfigPath);
        const inputFilePaths = await fg(inputPatterns);

        hermione.geminiMigrator = {
            config,
            inputSuites: [],
            outputTestCollections: [],
            inputFilePaths,
            outputFilePaths: [],
            utils
        };

        console.log(`Found ${inputFilePaths.length} Gemini files.`);

        await before(hermione);

        await Promise.mapSeries(
            inputFilePaths,
            async (inputFilePath) => {
                const inputSuite = Suite.create('');

                global.gemini = proxy(
                    testsAPI(inputSuite, null, inputFilePath, geminiAPI.config),
                    suiteUpdate,
                    geminiAPI
                );

                utils.requireWithNoCache(path.resolve(cwd, inputFilePath));

                delete global.gemini;

                const outputFilePath = filePathReplacer(inputFilePath);

                hermione.geminiMigrator.inputSuite = inputSuite;
                hermione.geminiMigrator.inputFilePath = inputFilePath;
                hermione.geminiMigrator.outputFilePath = outputFilePath;
                hermione.geminiMigrator.inputSuites.push(inputSuite);
                hermione.geminiMigrator.outputFilePaths.push(outputFilePath);

                await beforeEach(hermione);

                await fileGenerate(hermione);
                await readOutputTests(hermione);
                await copyScreenshots(hermione);

                await afterEach(hermione);
            }
        );

        await after(hermione);

        console.log('Generation hermione tests is finished.');

        return process.exit(0);
    });
};
