module.exports = async function(hermione) {
    const {outputFilePath} = hermione.geminiMigrator;
    
    await hermione.readTests(outputFilePath).then(outputTestCollection => {
        hermione.geminiMigrator.outputTestCollection = outputTestCollection;
        hermione.geminiMigrator.outputTestCollections.push(outputTestCollection);
    });
};
