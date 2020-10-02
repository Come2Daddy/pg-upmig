const pkg = require("../package.json");
const fixtures = require("./jest.fixtures.js");
const teardown = require("./jest.teardown.js");
const fs = require("fs");
const path = require("path");
const cmd = require("./cmd.js");
const { EOL } = require("os");

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

describe("Global options", () => {
    let proc;
    beforeAll(async () => {
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
        .toEqual(expect.arrayContaining(fixtures.cli.commands));
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
        .toEqual(expect.arrayContaining(fixtures.cli.commands));
    });

    test("Show global options with help help", async () => {
        const response = await proc.execute(["help", "help"]);
        expect(response.trim().split(EOL).filter(item => /^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())).map(item => item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1")))
        .toEqual(expect.arrayContaining(fixtures.cli.globalOptions));
    });

    test("Show commands with help help", async () => {
        const response = await proc.execute(["help", "help"]);
        expect(response.trim().split(EOL).filter(item => /^[a-z]+\s\[[^\]]+\]\s+/i.test(item.trim())).map(item => item.replace(/^\s+([a-z]+\s\[[^\]]+\])\s+.+$/i, "$1")))
        .toEqual(expect.arrayContaining(fixtures.cli.commands));
    });
});

describe("Show help for commands", () => {
    let proc;
    beforeAll(async () => {
        proc = cmd.create(path.join(__dirname,"../src/cli.js"));
    });

    test("Show help for command 'up'", async () => {
        const response = await proc.execute(["help", "up"]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.upHelp));
    });

    test("Show help for command 'up' with help option", async () => {
        const response = await proc.execute(["up", "-h"]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.upHelp));
    });

    test("Show help for command 'new'", async () => {
        const response = await proc.execute(["help", "new"]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.newHelp));
    });

    test("Show help for command 'new' with help option", async () => {
        const response = await proc.execute(["new", "-h"]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.newHelp));
    });

    test("Show help for command 'list'", async () => {
        const response = await proc.execute(["help", "list"]);
        expect(response.trim().split(EOL).filter(item => item).map(item => {
            if (/^\-[a-z],\s\-\-[a-z]+\s/i.test(item.trim())) {
                return item.replace(/^\s*(\-[a-z],\s\-\-[a-z]+(\s\<[^\>]+\>)?)(\s*.*)?$/i, "$1");
            }
            return item;
        }))
        .toEqual(expect.arrayContaining(fixtures.cli.listHelp));
    });

    test("Show help for command 'list' with help option", async () => {
        const response = await proc.execute(["list", "-h"]);
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
        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "new", fixtures.migrationFile], [], {env});
        const line = response.trim();
        expect(line).toEqual(expect.stringMatching(/Migration file created:\s+[0-9]+_.+$/i));
        const filename = line.replace(/^.+\s([0-9]+_[0-9a-z_\-]+)$/i, "$1");
        expect(fs.existsSync(path.join(fixtures.migrations, fixtures.sql, filename+".sql"))).toBe(true);
        expect(fs.existsSync(path.join(fixtures.migrations, filename+".js"))).toBe(true);
    });

    test("Create new migration file without sql placeholder file", async () => {
        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "new", fixtures.migrationFile, "-n"], [], {env});
        const line = response.trim();
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
            const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "new", fixtures.migrationFile], [], {env});
            details.push(created.trim().match(/\s([0-9]+)_([0-9a-z_\-]+)$/i));
        }
        const containing = [];

        for (let i = 0; i < details.length; i++) {
            containing.push(expect.stringMatching(new RegExp(`${details[i][2]}\\s+${details[i][1]}$`, "i")));
        }
        containing.push(expect.stringMatching(new RegExp(`Pending migrations:\\s+${details.length}$`, "i")));

        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "list"], [], {env});
        expect(response.trim().split(EOL)).toEqual(containing);

        // Perform left pending migrations
        await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "up"], [], {env});
    });

    test("List pending migratons with history", async () => {
        const details = [];
        for (let i = 0; i <= Math.round(Math.random() * 5); i++) {
            const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "new", fixtures.migrationFile], [], {env});
            details.push(created.trim().match(/\s([0-9]+)_([0-9a-z_\-]+)$/i));
        }
        const containing = [];

        for (let i = 0; i < details.length; i++) {
            containing.push(expect.stringMatching(new RegExp(`${details[i][2]}\\s+${details[i][1]}$`, "i")));
        }
        containing.push(expect.stringMatching(new RegExp(`Pending migrations:\\s+${details.length}/\[0\-9\]\+\\s\\(\[0\-9\]\+\\sdone\\)$`, "i")));

        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "list", "-H"], [], {env});
        expect(response.trim().split(EOL)).toEqual(containing);
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
        const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "new", fixtures.migrationFile], [], {env});
        const details = created.trim().match(/\s([0-9]+)_([0-9a-z_\-]+)$/i);
        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "up"], [], {env});
        expect(response.trim().split(EOL)).toEqual(expect.arrayContaining([
            expect.stringMatching(new RegExp(`${details[2]}\\s+${details[1]}$`, "i")),
            expect.stringMatching(/Migrations completed:\s+1$/i)
        ]));
    });

    test("Perform specific number of pending migrations", async () => {
        const details = [];
        for (let i = 0; i < 3; i++) {
            const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "new", fixtures.migrationFile], [], {env});
            details.push(created.trim().match(/\s([0-9]+)_([0-9a-z_\-]+)$/i));
        }
        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "up", "-s", "2"], [], {env});
        expect(response.trim().split(EOL)).toEqual(expect.arrayContaining([
            expect.stringMatching(new RegExp(`${details[0][2]}\\s+${details[0][1]}$`, "i")),
            expect.stringMatching(new RegExp(`${details[1][2]}\\s+${details[1][1]}$`, "i")),
            expect.stringMatching(/Migrations completed:\s+2$/i)
        ]));

        // Perform left pending migrations
        await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "up"], [], {env});
    });

    test("Perform pending migrations till specific timestamp", async () => {
        const details = [];
        for (let i = 0; i < 3; i++) {
            const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "new", fixtures.migrationFile], [], {env});
            details.push(created.trim().match(/\s([0-9]+)_([0-9a-z_\-]+)$/i));
        }
        const ts = parseInt(details[1][1], 10) + 1;
        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "up", "-t", ts], [], {env});
        expect(response.trim().split(EOL)).toEqual(expect.arrayContaining([
            expect.stringMatching(new RegExp(`${details[0][2]}\\s+${details[0][1]}$`, "i")),
            expect.stringMatching(new RegExp(`${details[1][2]}\\s+${details[1][1]}$`, "i")),
            expect.stringMatching(/Migrations completed:\s+2$/i)
        ]));

        // Perform left pending migrations
        await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "up"], [], {env});
    });

    test("Perform pending migrations first condition reached (steps & timestamp)", async () => {
        const details = [];
        for (let i = 0; i <= 4; i++) {
            const created = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "new", fixtures.migrationFile], [], {env});
            details.push(created.trim().match(/\s([0-9]+)_([0-9a-z_\-]+)$/i));
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

        const response = await proc.execute(["-m", fixtures.migrations, "-p", fixtures.pgTable, "-e", fixtures.envFile, "up", "-t", ts, "-s", bySt+1], [], {env});
        expect(response.trim().split(EOL)).toEqual(expect.arrayContaining(containing));
    });
});