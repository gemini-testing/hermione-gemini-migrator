const fs = require('fs');
const path = require('path');
const generate = require('@babel/generator').default;

const astGenerate = require('./ast-generator');

module.exports = async function(hermione) {
    const {config, inputSuite, inputFilePath, outputFilePath, utils} = hermione.geminiMigrator;
    const outputDir = path.dirname(outputFilePath);

    const oldCode = fs.readFileSync(inputFilePath, {encoding: 'utf8'}).replace(/\*\//g, '* /');
    const ast = astGenerate(inputSuite, config);
    
    const code = config.codeFormatter(
        '"use strict";\n\n' +
        generate(ast).code
            .replace(/"\$\$\(regexp\)(\/.*?\/)\$\$"/g, '$1') // babel don't parse regexp
            .replace(/  /g, '    ') +
        `\n\n/*\n${inputFilePath}\n\n${oldCode}*/\n`
    );

    utils.createDir(outputDir);
    fs.writeFileSync(outputFilePath, code, 'utf8');
};
