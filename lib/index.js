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
const utils = require('./utils');

const cwd = process.cwd();

module.exports = (hermione, opts) => {
    hermione.on(hermione.events.CLI, extendCli);
    
    const config = parseConfig(opts);
    const {enabled, geminiConfigPath, inputPatterns} = config;

    if (!enabled) return;

    hermione.on(hermione.events.AFTER_TESTS_READ, (testCollection) => {
        testCollection.disableAll();
    });

    if (hermione.isWorker()) return;

    hermione.once(hermione.events.INIT, async () => {
        const geminiAPI = new Gemini(geminiConfigPath);
        const inputFilePaths = await fg(inputPatterns);

        console.log(`Found ${inputFilePaths.length} Gemini files.`);

        await Promise.mapSeries(
            inputFilePaths,
                // .filter(filepath => filepath.includes('auth.gemini.js'))
            async (inputFilePath) => {
                const rootSuite = Suite.create('');

                global.gemini = proxy(
                    testsAPI(rootSuite, null, inputFilePath, geminiAPI.config),
                    suiteUpdate,
                    geminiAPI
                );

                utils.requireWithNoCache(path.resolve(cwd, inputFilePath));

                delete global.gemini;
        
                await fileGenerate(hermione, rootSuite, inputFilePath, config);
            }
        );

        console.log('Generation hermione tests is finished.');

        return process.exit(0);
    });
};
