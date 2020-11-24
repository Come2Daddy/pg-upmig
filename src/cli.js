#!/usr/bin/env node

const migration = require("./index.js");
const pkg = require("../package.json");
const { program } = require("commander");
const path = require("path");

let migrationsPath = process.env.UPMIG_PATH||"./migrations";
let pgTable = process.env.UPMIG_TABLE||"pg_upmig";
let reject = Boolean(process.env.UPMIG_REJECT)||false;

try {
    const dotConfig = require(path.join(process.cwd(), ".upmigrc.js"));
    migrationsPath = dotConfig.migrations?dotConfig.migrations:migrationsPath;
    pgTable = dotConfig.table?dotConfig.table:pgTable;
    reject = dotConfig.reject?dotConfig.reject:reject;
} catch (error) {}

function steps (s) {
    const parsed = parseInt(s.replace(/[^0-9]+/g, ""));
    return Number.isNaN(parsed)?0:parsed;
}

exports.steps = steps;

function timestamp (ts) {
    const parsed = parseInt(ts.replace(/[^0-9]+/g, ""));
    return Number.isNaN(parsed)?Date.now():parsed;
}

exports.timestamp = timestamp;

function migTable (name) {
    return name.toLowerCase().replace(/[^0-9a-z_]+/g, "");
}

exports.migTable = migTable;

function setOpt (namespace) {
    return (option) => {
        switch (namespace) {
            case "migrations":
                migrationsPath = option ? option:migrationsPath;
                break;
            case "pgtable":
                pgTable = option ? migTable(option):pgTable;
                break;
            case "reject":
                reject = option;
        }
    }
}

exports.setOpt = setOpt;

exports._env = () => {
    return {
        migrationsPath,
        pgTable
    };
}

program.on("option:migrations", setOpt("migrations"));
program.on("option:pgtable", setOpt("pgtable"));
program.on("option:reject", setOpt("reject"));

program.version(pkg.version)
.arguments("<cmd> [opt]")
.usage("<command> [options]")
.option("-m, --migrations <path>", "specify migrations path", "./migrations")
.option("-p, --pgtable <table>", "specify migration table name", "pg-upmig", migTable)
.option("-r, --reject", "dont ignore unauthorized ssl rejection");

async function up (cmd) {
    const mig = new migration({
        connection: {
            ssl: {
                rejectUnauthorized: reject
            }
        }
    });
    await mig.init({
        table: pgTable,
        migrations: migrationsPath,
        to: cmd.to,
        steps: cmd.steps
    });
    const done = await mig.up();
    mig.release();
    return done;
}

exports.up = up;

program
.command("up")
.description("Perform all pending migrations")
.option("-t, --to <timestamp>", "migrate to specific version", timestamp)
.option("-s, --steps <number>", "limit the number of migration to apply", steps)
.action(async (cmd) => {
    const done = await up(cmd);

    const len = done.reduce((accu, file) => Math.max(accu, file.name.length), 21);
    for (let file of done) {
        process.stdout.write(`\n\x1b[32m⇈")}\t\x1b[33m${file.name}\x1b[0m${" ".repeat(Math.ceil(len-file.name.length))}\t\x1b[35;1m${file.ts}\x1b[0m`);
    }
    process.stdout.write(`\n\x1b[32m✓\x1b[0m\tMigrations completed:${" ".repeat(Math.ceil(len-21))}\t\x1b[35;1m${done.length}\x1b[0m`);
    process.stdout.write("\n\n");
});

async function create (cmd, name){
    const mig = new migration({
        connection: {
            ssl: {
                rejectUnauthorized: reject
            }
        }
    });
    await mig.init({migrations: migrationsPath, table: pgTable});
    const file = await mig.create(name?name.join("-"):"", cmd.nosql);
    mig.release();
    return file;
}

exports.create = create;

program
.command("create")
.usage("<filename> [options]")
.description("Generate new migration file")
.option("-n, --nosql", "prevent creation of sql file")
.action(async (cmd, name) => {
    const file = await create(cmd, name);
    process.stdout.write(`\n\x1b[32m✓\x1b[0m\tMigration file created:\t\t\x1b[35;1m${file}\x1b[0m`);
    process.stdout.write("\n\n");
});

async function pending (cmd) {
    const mig = new migration({
        connection: {
            ssl: {
                rejectUnauthorized: reject
            }
        }
    });
    await mig.init({migrations: migrationsPath, table: pgTable, history: cmd.history});
    const list = await mig.pending();
    mig.release();
    return list;
}

exports.pending = pending;

program
.command("pending")
.description("List pending migrations")
.option("-H, --history", "show history about migrations")
.action(async (cmd) => {
    const list = await pending(cmd);
    const len = list.pending.reduce((accu, file) => Math.max(accu, file.name.length), 19);
    for (let file of list.pending) {
        process.stdout.write(`\n\x1b[34m⇉\t\x1b[33;1m${file.name}\x1b[0m${" ".repeat(Math.ceil(len-file.name.length))}\t\x1b[35;1m${file.ts}\x1b[0m`);
    }
    process.stdout.write(`\n\x1b[36mⓘ\x1b[0m\tPending migrations:${" ".repeat(Math.ceil(len-19))}\t\x1b[35;1m${list.pending.length}\x1b[0m${cmd.history?`/\x1b[35;1m${list.history+list.pending.length}\x1b[0m \x1b[32;1m(${list.history}\x1b[0m done)`:""}`);
    process.stdout.write("\n\n");
});

if (require.main === module) program.parse(process.argv);