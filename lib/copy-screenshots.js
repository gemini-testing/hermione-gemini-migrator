const fs = require('fs');
const path = require('path');

const cwd = process.cwd();

module.exports = async function(hermione) {
    const {inputSuite, outputTestCollection, inputFilePath, outputFilePath, config, utils} = hermione.geminiMigrator;
    const {rootSuiteTitle, browserIdReplacer} = config;
    const screensDirMap = {};

    outputTestCollection.getBrowsers().forEach(browserId => {
        outputTestCollection.eachTest(browserId, test => {
            const fullName = test.fullTitle().replace(`${rootSuiteTitle} `, '');
            const screenPath = hermione.config.forBrowser(browserId).getScreenshotPath(test, 'filename');

            screensDirMap[fullName] =  path.dirname(path.dirname(screenPath));
        });
    });

    hermione.geminiMigrator.inputScreenPaths = [];
    hermione.geminiMigrator.outputScreenPaths = [];

    const copyScreens = (inputSuite) => {
        if (!inputSuite.url || (inputSuite.children && inputSuite.children.length)) return;

        const {fullName, screenPaths = {}} = inputSuite;
        const browserIds = Object.keys(screenPaths);


        if (!browserIds.length) {
            console.log('\x1b[33mWarning! \'suite.capture\' was not called:\x1b[0m', inputFilePath);
        }

        browserIds.forEach(browserId => {
            const outputScreenDir = path.relative(
                cwd,
                path.resolve(screensDirMap[fullName], browserIdReplacer(browserId))
            );

            utils.createDir(outputScreenDir);

            Object.keys(screenPaths[browserId]).forEach(stateName => {
                const inputScreenPath = screenPaths[browserId][stateName];
                const outputScreenPath = path.resolve(outputScreenDir, `${stateName}.png`);

                hermione.geminiMigrator.inputScreenPaths.push(inputScreenPath);
                hermione.geminiMigrator.outputScreenPaths.push(outputScreenPath);

                fs.copyFileSync(inputScreenPath, outputScreenPath);
            });
        });
    };

    utils.suiteWalker(inputSuite, copyScreens);
};
