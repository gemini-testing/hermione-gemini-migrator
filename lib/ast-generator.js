const _ = require('lodash');
const t = require('@babel/types');
const generate = require('@babel/generator').default;
const {parse} = require('@babel/parser');

const {describe, it, browser, hermione} = require('./ast-helpers');

module.exports = function(rootSuite, {rootSuiteTitle, browserIdReplacer, commandReplacers}) {
    const suiteWalker = (suite) => {
        const statements = [];
        const suiteName = suite.name ? suite.name : rootSuiteTitle;

        ['skip', 'only'].forEach(parrentKey => {
            const mapKey = `${parrentKey}Map`;
            const map = suite[mapKey];

            if (map) {
                Object.keys(map).forEach(key => {
                    map[key].forEach(options => {
                        const browsers = browserIdReplacer(options.browsers);
                        
                        statements.push(hermione[parrentKey][key](browsers, options.comment));
                    });
                });
            }
        });

        if (suite.url === null) {
            statements.push(
                describe(suiteName, _.flattenDeep(suite.children.map(suiteWalker)))
            );
        } else {
            const formatCommand = function(command) {
                const replacer = commandReplacers[command.name];

                if (!replacer) {
                    return formatCommandDefault(command);
                }

                const commandStatementsDefault = [].concat(formatCommandDefault(command));
                const commandCodeDefault = generate(t.program(commandStatementsDefault)).code;
                
                const modifiedStatements = parse(replacer(commandCodeDefault, command.argList), {
                    allowImportExportEverywhere: true,
                    allowAwaitOutsideFunction: true,
                    allowReturnOutsideFunction: true,
                    allowSuperOutsideMethod: true
                }).program.body;

                return modifiedStatements;
            };

            statements.push(
                it(suiteName, _.flattenDeep([
                    formatCommand({name: 'url', argList: [suite.url]}),
                    suite.beforeActionsMap ? suite.beforeActionsMap.map(formatCommand) : [],
                    suite.states ? suite.states.map(state => {
                        const statements = [];
                        const stateName = state.name ? state.name : 'plain';
                        const {ignoreSelectors} = suite;
                        const options = ignoreSelectors && ignoreSelectors.length ?
                            {ignoreElements: ignoreSelectors} : null;

                        if (state.captureActionsMap) {
                            statements.push(...state.captureActionsMap.map(formatCommand));
                        }
                        
                        statements.push(browser.assertView(stateName, suite.captureSelectors, options));

                        return statements;
                    }) : [],
                    suite.afterActionsMap ? suite.afterActionsMap.map(formatCommand) : []
                ]))
            );
        }

        return statements;
    };
    
    return t.program(suiteWalker(rootSuite));
};

function formatCommandDefault({name, argList}) {
    switch (name) {
        case 'url':
            return browser.url(...argList);
        case 'wait':
            return browser.pause(...argList);
        case 'waitForElementToShow':
            return browser.waitForVisible(...argList);
        case 'waitForElementToHide':
            return browser.customWaitForHidden(...argList);
        case 'waitForJSCondition':
            return browser.customWaitForExecute(...argList);
        case 'click':
            return browser.click(...argList);
        case 'doubleClick':
            return browser.doubleClick(...argList);
        case 'dragAndDrop':
            return browser.customDragAndDrop(...argList);
        case 'mouseDown':
            return browser.buttonDown(...argList);
        case 'mouseUp':
            return browser.buttonUp(...argList);
        case 'mouseMove':
            return browser.moveToObject(...argList);
        case 'sendKeys':
            return browser.customKeyPress(...argList);
        case 'sendFile':
            return browser.chooseFile(...argList);
        case 'focus':
            return browser.customFocus(...argList);
        case 'tap':
            return browser.customTap(...argList);
        case 'flick':
            return browser.customFlick(...argList);
        case 'executeJS':
            return browser.execute(...argList);
        case 'setWindowSize':
            return browser.setViewportSize(...argList);
        case 'changeOrientation':
            return browser.customChangeOrientation(...argList);
        default:
            console.log(`Unknown command ${name}`);

            return;
    }
};
