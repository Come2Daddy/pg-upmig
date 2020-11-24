const pkg = require("../package.json");
const fixtures = require("./jest.fixtures.js");
const teardown = require("./jest.teardown.js");
const fs = require("fs");
const path = require("path");
const cmd = require("./cmd.js");
const { EOL } = require("os");
const cli = require("../src/cli.js");

const env = {
    PGPORT: process.env.PGPORT,
    PGUSER: process.env.PGUSER,
    PGHOST: process.env.PGHOST,
    PGDATABASE: process.env.PGDATABASE,
    PGPASSWORD: process.env.PGPASSWORD
};

beforeAll(async () => {
    await teardown();
});

afterAll(async () => {
    await teardown();
});

describe("Core helpers logic", () => {
    beforeAll(async () => {
        await teardown();
    });

    afterAll(async () => {
        await teardown();
    });

    test("steps function", () => {
        expect(cli.steps("go 2 steps")).toBe(2);
        expect(cli.steps("no steps")).toBe(0);
        expect(cli.steps("15")).toBe(15);
    });

    test("timestamp function", () => {
        expect(cli.timestamp("1601719495451")).toBe(1601719495451);
        expect(cli.timestamp("this is 135465")).toBe(135465);
        expect(cli.timestamp("no time")).toBeLessThanOrEqual(Date.now());
    });

    test("migTable function", () => {
        expect(cli.migTable("(Unusable) table_name@6postgresql")).toBe("unusabletable_name6postgresql");
    });

    test("setOpt function", () => {
        cli.setOpt("migrations")("");
        expect(cli._env().migrationsPath).toBe(fixtures.migrations);
        cli.setOpt("migrations")("null");
        expect(cli._env().migrationsPath).toBe("null");
        cli.setOpt("pgtable")("");
        expect(cli._env().pgTable).toBe(fixtures.pgTable);
        cli.setOpt("pgtable")("null");
        expect(cli._env().pgTable).toBe("null");
    });
});

describe("Core logic", () => {
    let created = "";
    let file = {};
    beforeAll(async () => {
        await teardown();
        cli.setOpt("migrations")(fixtures.migrations);
        cli.setOpt("pgtable")(fixtures.pgTable);
        cli.setOpt("env")(fixtures.envFile);
    });

    afterAll(async () => {
        await teardown();
    });

    test(`Command '${fixtures.cli._cmds.new}'`, async () => {
        created = await cli[fixtures.cli._cmds.new]({nosql: false}, [fixtures.migrationFile]);
        const re = new RegExp(`^[0-9]+_${fixtures.migrationFile}`)
        expect(re.test(created)).toBe(true);
    });

    test(`Command '${fixtures.cli._cmds.list}'`, async () => {
        const pending = await cli[fixtures.cli._cmds.list]({history: false});
        file = {
            filename: created,
            name: created.replace(/^[0-9]+_/, ""),
            ts: parseInt(created.replace(/^([0-9]+)_.*$/, "$1"))
        };
        expect(pending).toEqual({
            history: 0,
            pending: [file]
        });
    });

    test(`Command '${fixtures.cli._cmds.perform}'`, async() => {
        const done = await cli[fixtures.cli._cmds.perform]({to: null, steps: 0});
        expect(done).toEqual([file]);
    })
});

describe("Global options", () => {
    let proc;
    beforeAll(async () => {
        await teardown();
        proc = cmd.create(path.join(__dirname,"../src/cli.js"));
    });

    test("Show global options", async () => {
        const response = await proc.execute([]);
        expect(response.trim().split(EOL).filter(item => /^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())).map(item => item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1")))
        .toEqual(expect.arrayContaining(fixtures.cli.globalOptions));
    });

    test("Show commands", async () => {
        const response = await proc.execute([]);
        expect(response.trim().split(EOL).filter(item => /^[a-z]+\s\[[^\]]+\]\s+/i.test(item.trim())).map(item => item.replace(/^\s+([a-z]+\s\[[^\]]+\])\s+.+$/i, "$1")))
        .toEqual(expect.arrayContaining(fixtures.cli.commands.map(item => {
            for (let _cmd of Object.keys(fixtures.cli._cmds)) {
                item = item.replace(`%__${_cmd}__%`, fixtures.cli._cmds[_cmd]);
            }
            return item;
        })));
    });

    test("Show version", async () => {
        const response = await proc.execute(["-V"]);
        expect(response.trim()).toBe(pkg.version);
    });

    test("Show global options with help option", async () => {
        const response = await proc.execute(["-h"]);
        expect(response.trim().split(EOL).filter(item => /^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())).map(item => item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1")))
        .toEqual(expect.arrayContaining(fixtures.cli.globalOptions));
    });

    test("Show commands with help option", async () => {
        const response = await proc.execute(["-h"]);
        expect(response.trim().split(EOL).filter(item => /^[a-z]+\s\[[^\]]+\]\s+/i.test(item.trim())).map(item => item.replace(/^\s+([a-z]+\s\[[^\]]+\])\s+.+$/i, "$1")))
        .toEqual(expect.arrayContaining(fixtures.cli.commands.map(item => {
            for (let _cmd of Object.keys(fixtures.cli._cmds)) {
                item = item.replace(`%__${_cmd}__%`, fixtures.cli._cmds[_cmd]);
            }
            return item;
        })));
    });

    test("Show global options with help help", async () => {
        const response = await proc.execute(["help", "help"]);
        expect(response.trim().split(EOL).filter(item => /^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())).map(item => item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1")))
        .toEqual(expect.arrayContaining(fixtures.cli.globalOptions));
    });

    test("Show commands with help help", async () => {
        const response = await proc.execute(["help", "help"]);
        expect(response.trim().split(EOL).filter(item => /^[a-z]+\s\[[^\]]+\]\s+/i.test(item.trim())).map(item => item.replace(/^\s+([a-z]+\s\[[^\]]+\])\s+.+$/i, "$1")))
        .toEqual(expect.arrayContaining(fixtures.cli.commands.map(item => {
            for (let _cmd of Object.keys(fixtures.cli._cmds)) {
                item = item.replace(`%__${_cmd}__%`, fixtures.cli._cmds[_cmd]);
            }
            return item;
        })));
    });
});

describe("Show help for commands", () => {
    let proc;
    beforeAll(async () => {
        proc = cmd.create(path.join(__dirname,"../src/cli.js"));
    });

    test(`Show help for command '${fixtures.cli._cmds.perform}'`, async () => {
        const response = await proc.execute(["help", fixtures.cli._cmds.perform]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.upHelp));
    });

    test(`Show help for command '${fixtures.cli._cmds.perform}' with help option`, async () => {
        const response = await proc.execute([fixtures.cli._cmds.perform, "-h"]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.upHelp));
    });

    test(`Show help for command '${fixtures.cli._cmds.new}'`, async () => {
        const response = await proc.execute(["help", fixtures.cli._cmds.new]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.newHelp));
    });

    test(`Show help for command '${fixtures.cli._cmds.new}' with help option`, async () => {
        const response = await proc.execute([fixtures.cli._cmds.new, "-h"]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.newHelp));
    });

    test(`Show help for command '${fixtures.cli._cmds.list}'`, async () => {
        const response = await proc.execute(["help", fixtures.cli._cmds.list]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.listHelp));
    });

    test(`Show help for command '${fixtures.cli._cmds.list}' with help option`, async () => {
        const response = await proc.execute([fixtures.cli._cmds.list, "-h"]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.listHelp));
    });
});

describe("Create migration file", () => {
    let proc;
    beforeAll(async () => {
        proc = cmd.create(path.join(__dirname,"../src/cli.js"));
    });

    afterAll(async () => {
        await teardown();
    });

    test("Init and create new migration file", async () => {
        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.new, fixtures.migrationFile], [], {env});
        const line = response.trim().replace(/\x1b[[0-9;]+m/g, "");
        expect(line).toEqual(expect.stringMatching(/Migration file created:\s+[0-9]+_.+$/i));
        const filename = line.replace(/^.+\s([0-9]+_[0-9a-z_\-]+)$/i, "$1");
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, filename+".sql"))).toBe(true);
        expect(fs.existsSync(path.join(fixtures.migrations, filename+".js"))).toBe(true);
    });

    test("Create new migration file without sql placeholder file", async () => {
        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.new, fixtures.migrationFile, "-n"], [], {env});
        const line = response.trim().replace(/\x1b[[0-9;]+m/g, "");
        expect(line).toEqual(expect.stringMatching(/Migration file created:\s+[0-9]+_.+$/i));
        const filename = line.replace(/^.+\s([0-9]+_[0-9a-z_\-]+)$/i, "$1");
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, filename+".sql"))).toBe(false);
        expect(fs.existsSync(path.join(fixtures.migrations, filename+".js"))).toBe(true);
    });
});

describe("List pending migrations", () => {
    let proc;
    beforeAll(async () => {
        await teardown();
        proc = cmd.create(path.join(__dirname,"../src/cli.js"));
    });

    afterAll(async () => {
        await teardown();
    });

    test("List pending migratons without history", async () => {
        const details = [];
        for (let i = 0; i <= Math.round(Math.random() * 5); i++) {
            const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.new, fixtures.migrationFile], [], {env});
            details.push(created.trim().replace(/\x1b[[0-9;]+m/g, "").match(/\s([0-9]+)_([0-9a-z_\-]+)$/i));
        }
        const containing = [];

        for (let i = 0; i < details.length; i++) {
            containing.push(expect.stringMatching(new RegExp(`${details[i][2]}\\s+${details[i][1]}$`, "i")));
        }
        containing.push(expect.stringMatching(new RegExp(`Pending migrations:\\s+${details.length}$`, "i")));

        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.list], [], {env});
        expect(response.trim().replace(/\x1b[[0-9;]+m/g, "").split(EOL)).toEqual(containing);

        // Perform left pending migrations
        await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.perform], [], {env});
    });

    test("List pending migratons with history", async () => {
        const details = [];
        for (let i = 0; i <= Math.round(Math.random() * 5); i++) {
            const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.new, fixtures.migrationFile], [], {env});
            details.push(created.trim().replace(/\x1b[[0-9;]+m/g, "").match(/\s([0-9]+)_([0-9a-z_\-]+)$/i));
        }
        const containing = [];

        for (let i = 0; i < details.length; i++) {
            containing.push(expect.stringMatching(new RegExp(`${details[i][2]}\\s+${details[i][1]}$`, "i")));
        }
        containing.push(expect.stringMatching(new RegExp(`Pending migrations:\\s+${details.length}/\[0\-9\]\+\\s\\(\[0\-9\]\+\\sdone\\)$`, "i")));

        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.list, "-H"], [], {env});
        expect(response.trim().replace(/\x1b[[0-9;]+m/g, "").split(EOL)).toEqual(containing);
    });
});

describe("Perform pending migrations", () => {
    let proc;
    beforeAll(async () => {
        await teardown();
        proc = cmd.create(path.join(__dirname,"../src/cli.js"));
    });

    afterAll(async () => {
        await teardown();
    });

    test("Perform all pending migrations", async () => {
        const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.new, fixtures.migrationFile], [], {env});
        const details = created.trim().replace(/\x1b[[0-9;]+m/g, "").match(/\s([0-9]+)_([0-9a-z_\-]+)$/i);
        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.perform], [], {env});
        expect(response.trim().replace(/\x1b[[0-9;]+m/g, "").split(EOL)).toEqual(expect.arrayContaining([
            expect.stringMatching(new RegExp(`${details[2]}\\s+${details[1]}$`, "i")),
            expect.stringMatching(/Migrations completed:\s+1$/i)
        ]));
    });

    test("Perform specific number of pending migrations", async () => {
        const details = [];
        for (let i = 0; i < 3; i++) {
            const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.new, fixtures.migrationFile], [], {env});
            details.push(created.trim().replace(/\x1b[[0-9;]+m/g, "").match(/\s([0-9]+)_([0-9a-z_\-]+)$/i));
        }
        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.perform, "-s", "2"], [], {env});
        expect(response.trim().replace(/\x1b[[0-9;]+m/g, "").split(EOL)).toEqual(expect.arrayContaining([
            expect.stringMatching(new RegExp(`${details[0][2]}\\s+${details[0][1]}$`, "i")),
            expect.stringMatching(new RegExp(`${details[1][2]}\\s+${details[1][1]}$`, "i")),
            expect.stringMatching(/Migrations completed:\s+2$/i)
        ]));

        // Perform left pending migrations
        await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.perform], [], {env});
    });

    test("Perform pending migrations till specific timestamp", async () => {
        const details = [];
        for (let i = 0; i < 3; i++) {
            const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.new, fixtures.migrationFile], [], {env});
            details.push(created.trim().replace(/\x1b[[0-9;]+m/g, "").match(/\s([0-9]+)_([0-9a-z_\-]+)$/i));
        }
        const ts = parseInt(details[1][1], 10) + 1;
        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.perform, "-t", ts], [], {env});
        expect(response.trim().replace(/\x1b[[0-9;]+m/g, "").split(EOL)).toEqual(expect.arrayContaining([
            expect.stringMatching(new RegExp(`${details[0][2]}\\s+${details[0][1]}$`, "i")),
            expect.stringMatching(new RegExp(`${details[1][2]}\\s+${details[1][1]}$`, "i")),
            expect.stringMatching(/Migrations completed:\s+2$/i)
        ]));

        // Perform left pending migrations
        await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.perform], [], {env});
    });

    test("Perform pending migrations first condition reached (steps & timestamp)", async () => {
        const details = [];
        for (let i = 0; i <= 4; i++) {
            const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.new, fixtures.migrationFile], [], {env});
            details.push(created.trim().replace(/\x1b[[0-9;]+m/g, "").match(/\s([0-9]+)_([0-9a-z_\-]+)$/i));
        }
        const byTs = Math.round(Math.random() * 3);
        const bySt = Math.round(Math.random() * 3);
        const min = Math.min(byTs, bySt);
        const ts = parseInt(details[byTs][1], 10) + 1;
        const containing = [];

        for (let i = 0; i <= min; i++) {
            containing.push(expect.stringMatching(new RegExp(`${details[i][2]}\\s+${details[i][1]}$`, "i")));
        }
        containing.push(expect.stringMatching(new RegExp(`Migrations completed:\\s+${min+1}$`, "i")));

        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, fixtures.cli._cmds.perform, "-t", ts, "-s", bySt+1], [], {env});
        expect(response.trim().replace(/\x1b[[0-9;]+m/g, "").split(EOL)).toEqual(expect.arrayContaining(containing));
    });
});