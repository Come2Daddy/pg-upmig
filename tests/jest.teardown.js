const fs = require("fs");
const fixtures = require("./jest.fixtures.js");

module.exports = async (DB) => {
    try {
        await fs.promises.rmdir(fixtures.migrations, {recursive: true});
        await fs.promises.rmdir("coverage", {recursive: true});
    } catch (error) {
    }


    await DB.query(`DROP TABLE IF EXISTS ${fixtures.pgTable};`);
    await DB.query(`DROP TABLE IF EXISTS ${fixtures.jestmigTable};`)
};
