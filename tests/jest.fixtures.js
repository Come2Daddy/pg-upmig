module.exports = {
    envFile: "src/.env",
    migrations: "./jest-migrations",
    sql: "sql",
    templateStub: "template.stub",
    pgTable: "jest_pg_upmig",
    migrationFile: "jest-up",
    jestmigTable: "jest_mig_test",
    cli: {
        globalOptions: [
            "-V, --version",
            "-e, --env <path>",
            "-m, --migrations <path>",
            "-p, --pgtable <table>",
            "-h, --help"
        ],
        commands: [
            "up [options]",
            "new [options]",
            "list [options]",
            "help [command]"
        ],
        upHelp: [
            "Perform all pending migrations",
            "-t, --to <timestamp>",
            "-s, --steps <number>",
            "-h, --help"
        ],
        newHelp: [
            "Generate new migration file",
            "-n, --nosql",
            "-h, --help"
        ],
        listHelp: [
            "List pending migrations",
            "-H, --history",
            "-h, --help"
        ]
    }
};