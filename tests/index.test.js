const lib = require("../src/index.js");
const fixtures = require("./jest.fixtures.js");
const teardown = require("./jest.teardown.js");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const knex = require("knex");

let mig;
let DB;
let migs = [];

beforeAll(async () => {
    DB = new Client();
    await DB.connect();
    await teardown();
});

afterAll(async () => {
    DB.end();
    await teardown();
});

describe("Covering privates and specific code with default env vars", () => {
    beforeAll(async () => {
        mig = new lib();
        await mig.init();
    });

    afterAll(async () => {
        mig.release();
        mig = null;
        await teardown();
    });

    test("::_pluck -- array", () => {
        expect(mig._pluck([1,2])).toEqual([1,2]);
    });

    test("::_pluck -- object missing resultKey", () => {
        expect(mig._pluck({key: "super"})).toEqual([]);
    });

    test("::_pluck -- object finding resultKey", () => {
        expect(mig._pluck({rows: "super"})).toBe("super");
    });

    test("::_pluck -- any other type", () => {
        expect(mig._pluck(2)).toEqual([]);
        expect(mig._pluck("string")).toEqual([]);
        expect(mig._pluck(0.2)).toEqual([]);
        expect(mig._pluck(null)).toEqual([]);
        expect(mig._pluck(new Date())).toEqual([]);
    });

    test("::_query -- wrong queryMethod", async () => {
        mig.options.queryMethod = "woooooow";
        expect(await mig._query("SELECT NOW();")).toEqual({});
    });

    test("::up -- catch error", async () => {
        await mig.create(fixtures.migrationFile);
        expect(await mig.up()).toEqual([]);
    });
});

describe("Migration using environment variables", () => {
    beforeAll(async () => {
        mig = new lib();
        await mig.init();
    });

    afterAll(async () => {
        mig.release();
        mig = null;
        await teardown();
    });

    test("Should use default postgres client", async () => {
        expect(mig.client).toBeInstanceOf(Client);
    });

    test("Should create migrations directory", async () => {
        expect(fs.existsSync(fixtures.migrations)).toBe(true);
    });

    test("Should create sql directory", () => {
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql))).toBe(true);
    });

    test("Should create template.stub file", () => {
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.templateStub))).toBe(true);
    });

    test("Should list empty pending migrations", async () => {
        const files = await mig.pending();
        expect(files).toEqual({pending: [], last: null, history: 0});
    });

    test("Should create migration files", async () => {
        jestmig = await mig.create(fixtures.migrationFile);
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, jestmig+".sql"))).toBe(true);
        expect(fs.existsSync(path.join(fixtures.migrations, jestmig+".js"))).toBe(true);
    });

    test("Should list pending migrations", async () => {
        const files = await mig.pending();
        expect(files).toEqual({last: null, pending: [{filename: jestmig, name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}], history: 0});
    });

    test("Should perform pending migrations", async () => {
        await fs.promises.writeFile(path.join(fixtures.migrations, fixtures.sql, jestmig+".sql"), `CREATE TABLE IF NOT EXISTS ${fixtures.jestmigTable} (test boolean NOT NULL DEFAULT false);`, {encoding: "utf8"});
        await mig.up();
        const exists = await DB.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema' AND tablename = $1;", [fixtures.jestmigTable]);
        expect(exists.rows).toEqual([{tablename: fixtures.jestmigTable}]);
    });

    test("Should list empty pending migrations with history", async () => {
        const files = await mig.pending();
        expect(files).toEqual({pending: [], history: 1, last: {name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}});
    });

    test("Should create 4 migration files with SQL", async () => {
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        for (migfile of migs) {
            expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, migfile+".sql"))).toBe(true);
            expect(fs.existsSync(path.join(fixtures.migrations, migfile+".js"))).toBe(true);
            await fs.promises.writeFile(path.join(fixtures.migrations, fixtures.sql, migfile+".sql"), `INSERT INTO ${fixtures.jestmigTable} (test) VALUES (true);`, {encoding: "utf8"});
        }
    });

    test("Should create a migration without SQL file", async () => {
        migs.push(await mig.create(fixtures.migrationFile, true));
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, migs[4]+".sql"))).toBe(false);
        expect(fs.existsSync(path.join(fixtures.migrations, migs[4]+".js"))).toBe(true);
    })

    test("Should list 5 pending migrations", async () => {
        const files = await mig.pending();
        const pending = migs.map(item => {
            return {
                filename: item,
                name: item.replace(/^([0-9]+)_/, ""),
                ts: parseInt(item.match(/^([0-9]+)_/)[1], 10)
            };
        });
        expect(files).toEqual({pending, history: 1, last: {name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}});
    });

    test("Should perform 2 pending migrations over 3 steps", async () => {
        const files = await mig.pending();
        const up = await mig.up({
            to: files.pending[1].ts,
            steps: 3
        });
        expect(up).toEqual(files.pending.slice(0, 2));
    });

    test("Should perform 2 pending migrations over 3", async () => {
        const files = await mig.pending();
        const up = await mig.up({
            to: files.pending[2].ts,
            steps: 2
        });
        expect(up).toEqual(files.pending.slice(0, 2));
    });

    test("Should create unamed migration", async () => {
        const created = await mig.create("");
        const re = new RegExp("")
        expect(/^[0-9]+_unnamed/.test(created)).toBe(true);
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, created+".sql"))).toBe(true);
        expect(fs.existsSync(path.join(fixtures.migrations, created+".js"))).toBe(true);
    });
});

describe("Migration using custom PG database client", () => {
    beforeAll(async () => {
        migs = [];
        mig = new lib({
            options: {
                migrations: fixtures.migrations,
                table: fixtures.pgTable,
            },
            client: DB
        });
        await mig.init();
    });

    afterAll(async () => {
        mig = null;
        await teardown();
    });

    test("Should use default postgres client", async () => {
        expect(mig.client).toBeInstanceOf(Client);
    });

    test("Should create migrations directory", async () => {
        expect(fs.existsSync(fixtures.migrations)).toBe(true);
    });

    test("Should create sql directory", () => {
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql))).toBe(true);
    });

    test("Should create template.stub file", () => {
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.templateStub))).toBe(true);
    });

    test("Should list empty pending migrations", async () => {
        const files = await mig.pending();
        expect(files).toEqual({pending: [], history: 0, last: null});
    });

    test("Should create migration files", async () => {
        jestmig = await mig.create(fixtures.migrationFile);
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, jestmig+".sql"))).toBe(true);
        expect(fs.existsSync(path.join(fixtures.migrations, jestmig+".js"))).toBe(true);
    });

    test("Should list pending migrations", async () => {
        const files = await mig.pending();
        expect(files).toEqual({last: null, pending: [{filename: jestmig, name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}], history: 0});
    });

    test("Should perform pending migrations", async () => {
        await fs.promises.writeFile(path.join(fixtures.migrations, fixtures.sql, jestmig+".sql"), `CREATE TABLE IF NOT EXISTS ${fixtures.jestmigTable} (test boolean NOT NULL DEFAULT false);`, {encoding: "utf8"});
        await mig.up();
        const exists = await DB.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema' AND tablename = $1;", [fixtures.jestmigTable]);
        expect(exists.rows).toEqual([{tablename: fixtures.jestmigTable}]);
    });

    test("Should list empty pending migrations with history", async () => {
        const files = await mig.pending();
        expect(files).toEqual({pending: [], history: 1, last: {name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}});
    });

    test("Should create 4 migration files with SQL", async () => {
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        for (migfile of migs) {
            expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, migfile+".sql"))).toBe(true);
            expect(fs.existsSync(path.join(fixtures.migrations, migfile+".js"))).toBe(true);
            await fs.promises.writeFile(path.join(fixtures.migrations, fixtures.sql, migfile+".sql"), `INSERT INTO ${fixtures.jestmigTable} (test) VALUES (true);`, {encoding: "utf8"});
        }
    });

    test("Should create a migration without SQL file", async () => {
        migs.push(await mig.create(fixtures.migrationFile, true));
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, migs[4]+".sql"))).toBe(false);
        expect(fs.existsSync(path.join(fixtures.migrations, migs[4]+".js"))).toBe(true);
    })

    test("Should list 5 pending migrations", async () => {
        const files = await mig.pending();
        const pending = migs.map(item => {
            return {
                filename: item,
                name: item.replace(/^([0-9]+)_/, ""),
                ts: parseInt(item.match(/^([0-9]+)_/)[1], 10)
            };
        });
        expect(files).toEqual({pending, history: 1, last: {name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}});
    });

    test("Should perform 2 pending migrations over 3 steps", async () => {
        const files = await mig.pending();
        const up = await mig.up({
            to: files.pending[1].ts,
            steps: 3
        });
        expect(up).toEqual(files.pending.slice(0, 2));
    });

    test("Should perform 2 pending migrations over 3", async () => {
        const files = await mig.pending();
        const up = await mig.up({
            to: files.pending[2].ts,
            steps: 2
        });
        expect(up).toEqual(files.pending.slice(0, 2));
    });
});

describe("Migration using custom Knex database client", () => {
    beforeAll(async () => {
        const client = await knex({
            client: "pg",
            connection: {
                host : process.env.PGHOST,
                user : process.env.PGUSER,
                password : process.env.PGPASSWORD,
                database : process.env.PGDATABASE,
                port: process.env.PGPORT
            }
        });
        migs = [];
        mig = new lib({
            options: {
                migrations: fixtures.migrations,
                table: fixtures.pgTable,
                queryMethod: "raw",
                connectMethod: null,
                endMethod: "destroy"
            },
            client
        });
        await mig.init();
    });

    afterAll(async () => {
        await mig.release();
        mig = null;
        await teardown();
    });

    test("Should create migrations directory", async () => {
        expect(fs.existsSync(fixtures.migrations)).toBe(true);
    });

    test("Should create sql directory", () => {
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql))).toBe(true);
    });

    test("Should create template.stub file", () => {
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.templateStub))).toBe(true);
    });

    test("Should list empty pending migrations", async () => {
        const files = await mig.pending();
        expect(files).toEqual({pending: [], history: 0, last: null});
    });

    test("Should create migration files", async () => {
        jestmig = await mig.create(fixtures.migrationFile);
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, jestmig+".sql"))).toBe(true);
        expect(fs.existsSync(path.join(fixtures.migrations, jestmig+".js"))).toBe(true);
    });

    test("Should list pending migrations", async () => {
        const files = await mig.pending();
        expect(files).toEqual({last: null, pending: [{filename: jestmig, name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}], history: 0});
    });

    test("Should perform pending migrations", async () => {
        await fs.promises.writeFile(path.join(fixtures.migrations, fixtures.sql, jestmig+".sql"), `CREATE TABLE IF NOT EXISTS ${fixtures.jestmigTable} (test boolean NOT NULL DEFAULT false);`, {encoding: "utf8"});
        const files = await mig.up();
        const exists = await DB.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema' AND tablename = $1;", [fixtures.jestmigTable]);
        expect(exists.rows).toEqual([{tablename: fixtures.jestmigTable}]);
    });

    test("Should list empty pending migrations with history", async () => {
        const files = await mig.pending();
        expect(files).toEqual({pending: [], history: 1, last: {name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}});
    });

    test("Should create 4 migration files with SQL", async () => {
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        for (migfile of migs) {
            expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, migfile+".sql"))).toBe(true);
            expect(fs.existsSync(path.join(fixtures.migrations, migfile+".js"))).toBe(true);
            await fs.promises.writeFile(path.join(fixtures.migrations, fixtures.sql, migfile+".sql"), `INSERT INTO ${fixtures.jestmigTable} (test) VALUES (true);`, {encoding: "utf8"});
        }
    });

    test("Should create a migration without SQL file", async () => {
        migs.push(await mig.create(fixtures.migrationFile, true));
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, migs[4]+".sql"))).toBe(false);
        expect(fs.existsSync(path.join(fixtures.migrations, migs[4]+".js"))).toBe(true);
    })

    test("Should list 5 pending migrations", async () => {
        const files = await mig.pending();
        const pending = migs.map(item => {
            return {
                filename: item,
                name: item.replace(/^([0-9]+)_/, ""),
                ts: parseInt(item.match(/^([0-9]+)_/)[1], 10)
            };
        });
        expect(files).toEqual({pending, history: 1, last: {name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}});
    });

    test("Should perform 2 pending migrations over 3 steps", async () => {
        const files = await mig.pending();
        const up = await mig.up({
            to: files.pending[1].ts,
            steps: 3
        });
        expect(up).toEqual(files.pending.slice(0, 2));
    });

    test("Should perform 2 pending migrations over 3", async () => {
        const files = await mig.pending();
        const up = await mig.up({
            to: files.pending[2].ts,
            steps: 2
        });
        expect(up).toEqual(files.pending.slice(0, 2));
    });
});

describe("Migration using default database client with connection parameters", () => {
    beforeAll(async () => {
        migs = [];
        mig = new lib({
            options: {
                migrations: fixtures.migrations,
                table: fixtures.pgTable
            },
            connection: {
                host : process.env.PGHOST,
                user : process.env.PGUSER,
                password : process.env.PGPASSWORD,
                database : process.env.PGDATABASE,
                port: process.env.PGPORT
            }
        });
        await mig.init();
    });

    afterAll(async () => {
        await mig.release();
        mig = null;
        await teardown();
    });

    test("Should create migrations directory", async () => {
        expect(fs.existsSync(fixtures.migrations)).toBe(true);
    });

    test("Should create sql directory", () => {
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql))).toBe(true);
    });

    test("Should create template.stub file", () => {
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.templateStub))).toBe(true);
    });

    test("Should list empty pending migrations", async () => {
        const files = await mig.pending();
        expect(files).toEqual({pending: [], history: 0, last: null});
    });

    test("Should create migration files", async () => {
        jestmig = await mig.create(fixtures.migrationFile);
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, jestmig+".sql"))).toBe(true);
        expect(fs.existsSync(path.join(fixtures.migrations, jestmig+".js"))).toBe(true);
    });

    test("Should list pending migrations", async () => {
        const files = await mig.pending();
        expect(files).toEqual({last: null, pending: [{filename: jestmig, name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}], history: 0});
    });

    test("Should perform pending migrations", async () => {
        await fs.promises.writeFile(path.join(fixtures.migrations, fixtures.sql, jestmig+".sql"), `CREATE TABLE IF NOT EXISTS ${fixtures.jestmigTable} (test boolean NOT NULL DEFAULT false);`, {encoding: "utf8"});
        const files = await mig.up();
        const exists = await DB.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema' AND tablename = $1;", [fixtures.jestmigTable]);
        expect(exists.rows).toEqual([{tablename: fixtures.jestmigTable}]);
    });

    test("Should list empty pending migrations with history", async () => {
        const files = await mig.pending();
        expect(files).toEqual({pending: [], history: 1, last: {name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}});
    });

    test("Should create 4 migration files with SQL", async () => {
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        migs.push(await mig.create(fixtures.migrationFile));
        for (migfile of migs) {
            expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, migfile+".sql"))).toBe(true);
            expect(fs.existsSync(path.join(fixtures.migrations, migfile+".js"))).toBe(true);
            await fs.promises.writeFile(path.join(fixtures.migrations, fixtures.sql, migfile+".sql"), `INSERT INTO ${fixtures.jestmigTable} (test) VALUES (true);`, {encoding: "utf8"});
        }
    });

    test("Should create a migration without SQL file", async () => {
        migs.push(await mig.create(fixtures.migrationFile, true));
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, migs[4]+".sql"))).toBe(false);
        expect(fs.existsSync(path.join(fixtures.migrations, migs[4]+".js"))).toBe(true);
    })

    test("Should list 5 pending migrations", async () => {
        const files = await mig.pending();
        const pending = migs.map(item => {
            return {
                filename: item,
                name: item.replace(/^([0-9]+)_/, ""),
                ts: parseInt(item.match(/^([0-9]+)_/)[1], 10)
            };
        });
        expect(files).toEqual({pending, history: 1, last: {name: jestmig.replace(/^([0-9]+)_/, ""), ts: parseInt(jestmig.match(/^([0-9]+)_/)[1], 10)}});
    });

    test("Should perform 2 pending migrations over 3 steps", async () => {
        const files = await mig.pending();
        const up = await mig.up({
            to: files.pending[1].ts,
            steps: 3
        });
        expect(up).toEqual(files.pending.slice(0, 2));
    });

    test("Should perform 2 pending migrations over 3", async () => {
        const files = await mig.pending();
        const up = await mig.up({
            to: files.pending[2].ts,
            steps: 2
        });
        expect(up).toEqual(files.pending.slice(0, 2));
    });
});
