const fs = require('fs');
const path = require('path');
const generate = require('@babel/generator').default;

const astGenerate = require('./ast-generator');

module.exports = async function(hermione) {
    const {config, inputSuite, inputFilePath, outputFilePath, utils} = hermione.geminiMigrator;
    const outputDir = path.dirname(outputFilePath);

    const oldCode = fs.readFileSync(inputFilePath, {encoding: 'utf8'}).replace(/\*\//g, '* /');
    const ast = astGenerate(inputSuite, config);

    if (ast.body && !ast.body.length) {
        console.log('\x1b[33mWarning! File is empty:\x1b[0m', inputFilePath);

        return;
    }

    /*
     * Babel can't parse a regExp, he transforms it into an empty object.
     * So I wrapped the regular season in a row and mark this spot.
     * And then here in the code I replace the line with a regExp.
     */
    const code = config.codeFormatter(
        '"use strict";\n\n' +
        generate(ast).code
            .replace(/"\$\$\(regexp\)(\/.*?\/)\$\$"/g, '$1')
            .replace(/  /g, '    ') +
        `\n\n/*\n${inputFilePath}\n\n${oldCode}*/\n`
    );

    utils.createDir(outputDir);
    fs.writeFileSync(outputFilePath, code, 'utf8');
};
