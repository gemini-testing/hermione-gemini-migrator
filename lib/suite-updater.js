const _ = require('lodash');
const fs = require('fs');

const utils = require('./utils');

module.exports = function(proxyEmitter, geminiAPI) {
    proxyEmitter.on(proxyEmitter.events.BEFORE_GET, function(proxy, handlerArgs) {
        const [target, key] = handlerArgs;

        if (key === '_suite') {
            proxy.rootTarget.ctx.currentSuite = target[key];
        }
    });

    proxyEmitter.on(proxyEmitter.events.BEFORE_APPLY, function(proxy, handlerArgs) {
        const [target, thisArg, argList] = handlerArgs;
        const {currentSuite} = proxy.rootTarget.ctx;
        const parrentName = proxy.path[proxy.path.length - 2];
        const targetName = target.name || proxy.path[proxy.path.length - 1];
        
        if (['skip', 'only'].includes(parrentName) && ['in', 'notIn'].includes(targetName)) {
            const mapKey = `${parrentName}Map`;

            currentSuite[mapKey] = currentSuite[mapKey] || {};
            currentSuite[mapKey][targetName] = currentSuite[mapKey][targetName] || [];
            currentSuite[mapKey][targetName].push({browsers: argList[0], comment: argList[1]})
        }

        if (['before', 'after', 'capture'].includes(targetName)) {
            const [name, action] = argList;
            const mapKey = `${targetName}ActionsMap`;

            if (targetName === 'capture' && !_.isObject(name)) {
                proxy.rootTarget.ctx.currentStateName = name;
            }

            proxy.rootTarget.ctx[mapKey] = [];
        }

        if (['before', 'after', 'capture'].includes(parrentName) && !targetName.startsWith('_')) {
            const mapKey = `${parrentName}ActionsMap`;

            proxy.rootTarget.ctx[mapKey].push({
                name: targetName,
                argList: utils.stringifyValue(argList)
            });
        }
    });

    proxyEmitter.on(proxyEmitter.events.AFTER_APPLY, function(proxy, handlerArgs, result) {
        const [target, thisArg, argList] = handlerArgs;
        const {currentSuite, currentStateName} = proxy.rootTarget.ctx;
        const targetName = target.name || proxy.path[proxy.path.length - 1];

        if (['before', 'after', 'capture'].includes(targetName)) {
            const mapKey = `${targetName}ActionsMap`;

            if (targetName === 'capture') {
                const currentState = _.find(currentSuite.states, {name: currentStateName});

                if (currentState) {
                    currentState[mapKey] = proxy.rootTarget.ctx[mapKey];
                    currentSuite.screenPaths = currentSuite.screenPaths || {};

                    geminiAPI.browserIds.forEach(browserId => {
                        const screenPath = geminiAPI.getScreenshotPath(currentSuite, currentStateName, browserId);

                        if (fs.existsSync(screenPath)) {
                            currentSuite.screenPaths[browserId] = currentSuite.screenPaths[browserId] || {};
                            currentSuite.screenPaths[browserId][currentStateName] = screenPath;
                        }
                    });
                }
            } else {
                currentSuite[mapKey] = proxy.rootTarget.ctx[mapKey];
            }
        }
    });
};
