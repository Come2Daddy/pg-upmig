const fs = require("fs");
const fixtures = require("./jest.fixtures.js");
const { Client } = require("pg");
require("dotenv").config({path: "../src/.env"});

module.exports = async () => {
    try {
        await fs.promises.rmdir(fixtures.migrations, {recursive: true});
        await fs.promises.rmdir("coverage", {recursive: true});
    } catch (error) {
    }

    const DB = new Client();
    await DB.connect();
    await DB.query(`DROP TABLE IF EXISTS ${fixtures.pgTable};`);
    await DB.query(`DROP TABLE IF EXISTS ${fixtures.jestmigTable};`)
    DB.end();
};
