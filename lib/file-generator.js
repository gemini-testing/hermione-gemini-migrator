const fs = require('fs');
const path = require('path');
const generate = require('@babel/generator').default;

const astGenerate = require('./ast-generator');
const utils = require('./utils');

const cwd = process.cwd();
const screenCount = 0;

module.exports = async function(hermione, suite, inputFilePath, config) {
    const {rootSuiteTitle, filePathReplacer, browserIdReplacer} = config;
    const outputFilePath = filePathReplacer(inputFilePath);
    const outputDir = path.dirname(outputFilePath);

    const oldCode = fs.readFileSync(inputFilePath, {encoding: 'utf8'}).replace(/\*\//g, '* /');
    const ast = astGenerate(suite, config);
    
    // TODO: Add prettier
    const code = '"use strict";\n\n' + generate(ast).code
        .replace(/"\$\$\(regexp\)(\/.*\/)\$\$"/g, '$1') // babel don't parse regexp
        .replace(/  /g, '    ') + `\n\n/*\n${inputFilePath}\n\n${oldCode}*/`;

    utils.createDir(outputDir);
    fs.writeFileSync(outputFilePath, code, 'utf8');

    const screensDirMap = {};

    await hermione.readTests(outputFilePath).then(testCollection => {
        testCollection.getBrowsers().forEach(browserId => {
            testCollection.eachTest(browserId, test => {
                const fullName = test.fullTitle().replace(`${rootSuiteTitle} `, '');
                const screenPath = hermione.config.forBrowser(browserId).getScreenshotPath(test, 'filename');
                
                screensDirMap[fullName] =  path.dirname(path.dirname(screenPath));
            });
        });
    });

    const suiteWalker = (suite) => {
        if (suite.children) {
            suite.children.forEach(suiteWalker);
        }

        if (!suite.url) return;

        const {fullName, screenPaths} = suite;
        
        Object.keys(screenPaths).forEach(browserId => {
            const outputScreenDir = path.relative(
                cwd,
                path.resolve(screensDirMap[fullName], browserIdReplacer(browserId))
            );

            utils.createDir(outputScreenDir);

            Object.keys(screenPaths[browserId]).forEach(stateName => {
                const inputScreenPath = screenPaths[browserId][stateName];
                const outputScreenPath = path.resolve(outputScreenDir, `${stateName}.png`);

                fs.copyFileSync(inputScreenPath, outputScreenPath);
            });
        });
    };

    suiteWalker(suite);
};
