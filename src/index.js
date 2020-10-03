/** @module pg-upmig */

const { Client, types } = require("pg");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

/**
 * Connect to DB (create table if not exists)
 * @class
 * @classdesc
 * @param {Object} params Constructor arguments
 * @param {Object} params.client Custom database client
 * @param {Object} params.connection PG connection params
 * @param {String} params.envFile Environment file path
 * @param {Object} params.options Global options
 * @param {String} params.options.table Migrations table
 * @param {String} params.options.migrations Migrations path
 * @param {Boolean} params.options.transactionnal Whenever to use transaction for migrations
 * @param {String} params.options.queryMethod Client method name to query raw SQL
 * @param {String} params.options.connectMethod Client method name to connect
 * @param {String} params.options.endMethod Client method name to release connection
 * @param {String} params.options.resultKey Key to pluck from query result object
 * @param {String} params.options.steps Number of migration to perform
 * @param {String} params.options.to Timestamp of migration to reach
 * @param {Boolean} params.options.debug Enable debug mode
 */
class migration {
    constructor (params) {
        // Handles int types
        types.setTypeParser(20, "text", parseInt);
        types.setTypeParser(21, "text", parseInt);
        types.setTypeParser(23, "text", parseInt);
        types.setTypeParser(1700, "text", parseInt);

        // Handles date types
        types.setTypeParser(1082, "text", (date) => new Date(date));
        types.setTypeParser(1083, "text", (date) => new Date(date));
        types.setTypeParser(1114, "text", (date) => new Date(date));
        types.setTypeParser(1184, "text", (date) => new Date(date));
        types.setTypeParser(1266, "text", (date) => new Date(date));

        this.isInit = false;
        this.isConnected = false;

        this.options = {
            table: "pg_upmig",
            migrations: "./migrations",
            transactionnal: true,
            queryMethod: "query",
            connectMethod: "connect",
            endMethod: "end",
            resultKey: "rows",
            steps: 0,
            to: 0,
            debug: false
        };

        if (params.options) {
            Object.assign(this.options, params.options);
        }

        // finds environment file path first if defined
        try {
            const cfg = dotenv.config({path: params.envFile});
            if (cfg.error) {
                throw new Error("Check for standard environment file (.env)");
            }
        } catch (error) {
            this._debug(error, 1);
            dotenv.config();
        }

        // Sets custom database client
        if (params.client) {
            this.client = params.client;
        }

        // Sets default database client
        if (!this.client) {
            if (params.connection) {
                // Uses connection params
                this.client = new Client(params.connection);
            } else {
                // Try to connect with environment variables
                // At this point, if nothing is provided we let PG client rise errors
                this.client = new Client();
            }
        }
    }

    /**
     * Reports debug messages && errors
     * @memberof migration
     * @private
     * @param {*} msg Message or error
     * @param {Number} level Debug level [1-4]
     * @returns {void}
     */
    _debug (msg, level = 4) {
        const levels = [null, "error", "warn", "log"];
        if (this.options.debug === true) console[levels[level]||"log"].call(console, msg);
    }

    /**
     * Connects client
     * @memberof migration
     * @private
     * @async
     * @returns {void}
     */
    async _connect () {
        if (!this.isConnected) {
            try {
                await this.client[this.options.connectMethod].call(this.client);
            } catch (error) {
                //Client has been connected already
                this._debug(error, 1);
            }
        }
        this.isConnected = true;
    }

    /**
     * Performs query
     * @memberof migration
     * @private
     * @async
     * @param {...*} args Query method arguments
     * @returns {Promise} Query promise
     */
    _query () {
        try {
            return this.client[this.options.queryMethod].apply(this.client, [...arguments]);
        } catch (error) {
            this._debug(error, 1);
            return Promise.resolve({});
        }
    }

    /**
     * Plucks key form query's result
     * @memberof migration
     * @private
     * @param {*} result Query's result
     * @returns {Object} Array of objects
     */
    _pluck (result) {
        if (result instanceof Array) {
            return result;
        }

        if (typeof(result) === "object" && result) {
            if (result[this.options.resultKey]) {
                return result[this.options.resultKey];
            }
        }

        return [];
    }

    /**
     * Initializes migration
     * @memberof migration
     * @public
     * @async
     * @param {Object} options Options
     * @param {String} options.migrations Migrations path
     * @param {String} options.table Migrations table
     * @param {Boolean} options.transactionnal Whenever to use transaction for migrations
     * @param {String} options.queryMethod Client method name to query raw SQL
     * @param {String} options.connectMethod Client method name to connect
     * @param {String} options.endMethod Client method name to release connection
     * @param {String} options.resultKey Key to pluck from query result object
     * @param {String} options.steps Number of migration to perform
     * @param {String} options.to Timestamp of migration to reach
     * @param {Boolean} options.debug Enable debug mode
     * @returns {ThisType}
     */
    async init (options) {
        Object.assign(this.options, options);

        // Skip init if already done
        if (this.isInit) return true;

        await this._connect();

        // Creates directories if needed
        try {
            await fs.promises.mkdir(this.options.migrations);
            await fs.promises.mkdir(path.join(this.options.migrations, "sql"));
        } catch (error) {
            this._debug(error, 2);
        }

        if (!fs.existsSync(path.join(this.options.migrations, "template.stub"))) {
            await fs.promises.writeFile(path.join(this.options.migrations, "template.stub"), `const fs = require("fs");
const path = require("path");

const file = path.basename(__filename, ".js");
const filePath = path.dirname(__filename);

module.exports = async (client, method) => {
    const sql = await fs.promises.readFile(path.join(filePath, \`./sql/\${file}.sql\`), {encoding: "utf8"});
    return client[method].call(client, sql);
}
`, {encoding: "utf8"});
        }

        await this._query(`CREATE TABLE IF NOT EXISTS ${this.options.table}
(
    date timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name varchar(255) NOT NULL,
    ts bigint NOT NULL,
    filename text NOT NULL
);`);
        this.isInit = true;

        return true;
    }

    /**
     * Lists migration files ordered by name ASC
     * @memberof migration
     * @private
     * @async
     * @returns {Object} Array of objects - All migration files (including done and pending)
     */
    async _files () {
        // Reads migrations directory and filter files by name
        const files = await fs.promises.readdir(this.options.migrations);
        const filtered = files.filter(file => /^[0-9]+_.+\.js$/.test(file));

        // Creates detailed file list
        const infos = [];
        for (let file of filtered) {
            infos.push({
                "filename": path.basename(file, ".js"),
                "ts": parseInt(file.match(/^([0-9]+)_.+$/)[1]),
                "name": file.match(/^[0-9]+_(.+)+\.js$/)[1]
            });
        }

        // Sort file list by name ascending
        infos.sort((a, b) => a.ts - b.ts);

        return infos;
    }

    /**
     * Lists pending migration based on last successful migration
     * @memberof migration
     * @public
     * @async
     * @param {Object} options Options
     * @param {String} options.migrations Migrations path
     * @param {String} options.table Migrations table
     * @param {Boolean} options.transactionnal Whenever to use transaction for migrations
     * @param {String} options.queryMethod Client method name to query raw SQL
     * @param {String} options.connectMethod Client method name to connect
     * @param {String} options.endMethod Client method name to release connection
     * @param {String} options.resultKey Key to pluck from query result object
     * @param {String} options.steps Number of migration to perform
     * @param {String} options.to Timestamp of migration to reach
     * @param {Boolean} options.debug Enable debug mode
     * @returns {Object} Result
     * pending: Array of objects - Available pending migration files
     * history: String - pending number / done number
     */
    async pending (options = null) {
        // Extends instance options
        Object.assign(this.options, options);

        await this.init();

        const files = await this._files();
        const latest = this._pluck(await this._query(`SELECT ts FROM ${this.options.table} ORDER BY ts DESC;`));
        let idx = 0;

        // Find the first file with a timestamp greater than the last successful migration
        if (latest.length) {
            idx = files.findIndex(file => file.ts > latest[0].ts);
        }

        const pending = idx >= 0 ? files.slice(idx, files.length) : [];

        return {pending, history: latest.length};
    }

    /**
     * Performs all pending migrations
     * @memberof migration
     * @public
     * @async
     * @param {Object} options Options
     * @param {String} options.migrations Migrations path
     * @param {String} options.table Migrations table
     * @param {Boolean} options.transactionnal Whenever to use transaction for migrations
     * @param {String} options.queryMethod Client method name to query raw SQL
     * @param {String} options.connectMethod Client method name to connect
     * @param {String} options.endMethod Client method name to release connection
     * @param {String} options.resultKey Key to pluck from query result object
     * @param {String} options.steps Number of migration to perform
     * @param {String} options.to Timestamp of migration to reach
     * @param {Boolean} options.debug Enable debug mode
     * @returns {Object} Array of object - Migration files used
     */
    async up (options) {
        // Extends instance options
        Object.assign(this.options, options);

        await this.init();

        const files = await this.pending(this.options);
        let step = 0;

        try {
            // Starts transactionnal
            if (this.options.transactionnal) await this._query("BEGIN;");

            for (let file of files.pending) {
                // First of steps or target to exit loop
                if (this.options.steps && this.options.steps <= step) break;
                if (this.options.to && this.options.to < file.ts) break;

                // Loads migration
                const query = require(path.join(process.cwd(), this.options.migrations, `${file.filename}.js`));

                await query(this.client, this.options.queryMethod);

                // Registers migration
                await this._query(`INSERT INTO ${this.options.table} (name, ts, filename) VALUES ('${file.name}', ${file.ts}, '${file.filename}');`);
                step++;
            }

            // Commit transaction
            if (this.options.transactionnal) await this._query("COMMIT;");
        } catch (error) {
            this._debug(error, 1);
            await this._query("ROLLBACK;");
        }

        return files.pending.slice(0, step);
    }

    /**
     * Generates new migration file
     * @memberof migration
     * @public
     * @async
     * @param {String} name Migration name
     * @param {Boolean} nosql Shoulds it skip creation of sql file
     * @returns {String} File name
     */
    async create (name, nosql = false) {
        await this.init();

        const date = new Date();
        const ts = parseInt(date.getTime());

        if (!name) name = "unnamed";
        name = name.replace(/[^0-9a-z_\- ]+/ig, "").replace(/\s+/g, "-");

        // Retries if migration file exists
        if (fs.existsSync(path.join(this.options.migrations, `${ts}_${name}.js`))) {
            // Delays retry
            await new Promise(resolve => setTimeout(resolve, 50));
            // Avoids stack overflow case
            return await new Promise(resolve => setImmediate(() => {
                resolve(this.create(name, nosql));
            }));
        }

        if (!nosql && !fs.existsSync(path.join(this.options.migrations, `sql/${ts}_${name}.sql`))) {
            // Creates SQL file
            await fs.promises.writeFile(path.join(this.options.migrations, `sql/${ts}_${name}.sql`), "-- SQL", {encoding: "utf8"});
        }

        // Creates migration file
        await fs.promises.copyFile(path.join(this.options.migrations, "template.stub"), path.join(this.options.migrations, `${ts}_${name}.js`));

        return `${ts}_${name}`;
    }

    /**
     * Releases DB connection
     * @memberof migration
     * @public
     * @async
     * @returns {void}
     */
    release () {
        return this.client[this.options.endMethod].call(this.client);
    }
}

module.exports = migration;