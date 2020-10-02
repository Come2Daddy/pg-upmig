#!/usr/bin/env node

const migration = require("./index.js");
const pkg = require("../package.json");
const chalk = require("chalk");
const { program } = require("commander");


function timestamp (ts) {
    return parseInt(ts.replace(/[^0-9]+/, ""));
}

function migTable (name) {
    return name.toLowerCase().replace(/[^0-9a-z_]+/, "");
}

let envFile = ".env";
let migrationsPath = "./migrations";
let pgTable = "pg_upmig";

program.on("option:env", (o) => {
    if (o) envFile = o;
});

program.on("option:migrations", (o) => {
    if (o) migrationsPath = o;
});

program.on("option:pgtable", (o) => {
    if (o) pgTable = migTable(o);
});

program.version(pkg.version)
.arguments("<cmd> [opt]")
.usage("<command> [options]")
.option("-e, --env <path>", "specify environment file path")
.option("-m, --migrations <path>", "specify migrations path", "./migrations")
.option("-p, --pgtable <table>", "specify migration table name", "pg-upmig", migTable);

program
.command("up")
.description("Perform all pending migrations")
.option("-t, --to <timestamp>", "migrate to specific version", timestamp)
.option("-s, --steps <number>", "limit the number of migration to apply", parseInt)
.action(async (cmd) => {
    const mig = new migration({envFile});
    await mig.init({
        table: pgTable,
        migrations: migrationsPath,
        to: cmd.to,
        steps: cmd.steps
    });
    const done = await mig.up();
    mig.release();
    const len = done.reduce((accu, file) => Math.max(accu, file.name.length), 21);
    for (let file of done) {
        process.stdout.write(`\n${chalk.blue("⇈")}\t${chalk.yellow(file.name)}${" ".repeat(Math.ceil(len-file.name.length))}\t${chalk.magenta.bold(file.ts)}`);
    }
    process.stdout.write(`\n${chalk.green("✓")}\tMigrations completed:${" ".repeat(Math.ceil(len-21))}\t${chalk.magenta.bold(done.length)}`);
    process.stdout.write("\n\n");
});

program
.command("new")
.usage("<filename> [options]")
.description("Generate new migration file")
.option("-n, --nosql", "prevent creation of sql file")
.action(async (cmd, name) => {
    const mig = new migration({envFile});
    await mig.init({migrations: migrationsPath, table: pgTable});
    const file = await mig.create(name.join("-"), cmd.nosql);
    mig.release();
    process.stdout.write(`\n${chalk.green("✓")}\tMigration file created:\t\t${chalk.magenta.bold(file)}`);
    process.stdout.write("\n\n");
});

program
.command("list")
.description("List pending migrations")
.option("-H, --history", "show history about migrations")
.action(async (cmd) => {
    const mig = new migration({envFile});
    await mig.init({migrations: migrationsPath, table: pgTable, history: cmd.history});
    const list = await mig.pending();
    mig.release();
    const len = list.pending.reduce((accu, file) => Math.max(accu, file.name.length), 19);
    for (let file of list.pending) {
        process.stdout.write(`\n${chalk.blue("⇉")}\t${chalk.yellow.bold(file.name)}${" ".repeat(Math.ceil(len-file.name.length))}\t${chalk.magenta.bold(file.ts)}`);
    }
    process.stdout.write(`\n${chalk.cyan("ⓘ")}\tPending migrations:${" ".repeat(Math.ceil(len-19))}\t${chalk.magenta.bold(list.pending.length)}${cmd.history?`/${chalk.magenta.bold(list.history+list.pending.length)} (${chalk.green.bold(list.history)} done)`:""}`);
    process.stdout.write("\n\n");
});

program.parse(process.argv);