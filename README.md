# Postgres migration tool
[![Build Status](https://travis-ci.com/Come2Daddy/pg-upmig.svg?branch=master)](https://travis-ci.com/Come2Daddy/pg-upmig)
[![Coverage Status](https://coveralls.io/repos/github/Come2Daddy/pg-upmig/badge.svg?branch=master)](https://coveralls.io/github/Come2Daddy/pg-upmig?branch=master)
[![GitHub license](https://img.shields.io/github/license/Come2Daddy/pg-upmig.svg)](https://github.com/Come2Daddy/pg-upmig/blob/master/LICENSE)
[![GitHub release](https://img.shields.io/github/release/Come2Daddy/pg-upmig.svg)](https://GitHub.com/Come2Daddy/pg-upmig/releases/)
[![Dependencies](https://david-dm.org/Come2Daddy/pg-upmig.svg)](https://github.com/Come2Daddy/pg-upmig/blob/master/package.json)

> You don't rollback, if your step forward has altered data you may end with some messed up relations :sob:. Going forward only is a way to force you into thinking the migration as a whole.

* [Install](#install)
* [API](#api)

## Install
```bash
npm install --save pg-upmig
```
or
```bash
yarn add pg-upmig
```

## Configuration
Either use environment variables
```bash
UPMIG_PATH=./migrations
UPMIG_TABLE=pg_upmig
UPMIG_REJECT=false
UPMIG_DEBUG=false
UPMIG_SSL=true
```
or use `.upmigrc.js` to set global options:
```javascript

/** Quick tip to load .env file in local environment for example **/
const fs = require("fs");

try {
    fs.readFileSync(".env") // read config file
    .toString("utf8") // buffer to string
    .split(/\n|\r|\r/) // break by new line
    .filter(item => /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.test(item)) // keep key / val
    .map(item => {
        const match = item.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (!Object.prototype.hasOwnProperty.call(process.env, match[1])) process.env[match[1]] = match[2].replace(/^("|')(.*)\1$/, "$2"); // set env without overwritting
    });
} catch (error) {}
/** End of tip **/

module.exports = {
  migrations: "./migrations", // Where to store migrations files
  table: "pg_upmig", // Table name where migrations history is stored
  debug: false
};
```
## Migrations folder tree view
```
.
+-- migrations
|   +-- sql
|   |   +-- 1600775947530_create-table.sql
|   +-- 1600775947530_create-table.js
|   +-- template.stub
```
### Programatic migration
You can modify `template.stub` or any JS migration file to suit your needs as long as it stays a **CommonJS module** exporting a `function` which returns a `Promise`.

```javascript
module.exports = (client, method) => {
  // client default to node-postgres https://www.npmjs.com/package/pg
  // method default to "query"
  return new Promise((resolve, reject) => {
    // your stuff;
  });
}
```
You may want to use your specific client query builder (**API**) instead of raw SQL queries. You may also want to skip sql file creation (**[API](#pg-upmig.createname-nosql)**)

### SQL queries
The SQL files in sql directory are placeholders for you to write migrations steps.

## Usage

### API

#### Usage

```javascript
const upmig = require("pg-upmig");

const migration = new upmig({
  options: {
    migration: "./migrations",
    table: "pg_upmig",
    transactionnal: true,
    queryMethod: "query",
    connectMethod: "connect",
    endMethod: "end",
    resultKey: "rows",
    debug: false
  }
});

// Perform a migratiion over the firsts
// two pending migrations
migration.up({
  steps: 2
})
.then((result) => {
  // do something
})
.catch((error) => {
  // log error
});
```

#### Class constructor parameter
|Key|Description|
|-|-|
|options|[Global options](#global-options)|
|connection|[Connection parameters](#connection-parameters) for default `node-postgres` client|
|client|[Custom postgres client](#custom-postgres-client) instance|

##### Global options
|Key|Type|Description|Default|
|-|-|-|-|
|table|string|Migrations table in which are stored performed migrations.|`pg_upmig`|
|migrations|string|Migrations path where migration files are stored.|`./migrations`|
|transactionnal|boolean|Either to use or not transaction with migration queries.|`true`|
|queryMethod|string|[Client](#custom-postgres-client) method to perform raw SQL queries.|`query`|
|connectMethod|string|[Client](#custom-postgres-client) method to connect to database.|`connect`|
|endMethod|string|[Client](#custom-postgres-client) method to close connection.|`end`|
|resultKey|string|[Client](#custom-postgres-client) query result object key.|`rows`|
|steps|number|Limits how many pending migrations to perform. When used with `to`, stops on the first condition reached.|`0`|
|to|number|Define a timestamp (part of migration filname) up where to perform pending migrations. When used with `to`, stops on the first condition reached|`0`|
|debug|boolean|Enable debug|`false`|

##### Connection parameters
See [node-postgres](https://www.npmjs.com/package/pg) documentation.
##### Custom postgres client
You can use any postgres client able to perform raw queries:
* [node-postgres](https://www.npmjs.com/package/pg)
* [knex](https://www.npmjs.com/package/knex)
* [sequelize](https://www.npmjs.com/package/sequelize)
* more...

Example with knex:
```javascript
const upmig = require("pg-upmig");
const knex = require("knex");

// Instanciate knex to connect with postgres driver
const client = knex({
    client: "pg",
    connection: {
        host : process.env.PGHOST,
        user : process.env.PGUSER,
        password : process.env.PGPASSWORD,
        database : process.env.PGDATABASE,
        port: process.env.PGPORT,
        ssl: String(process.env.UPMIG_SSL).toLowerCase()==="false" ? false : { rejectUnauthorized: String(process.env.UPMIG_REJECT).toLowerCase()==="true"}
    }
});

// Instanciate pg-upmig with knex as client
const migration = new upmig({
  options: {
    migrations: "./admin-migrations",
    table: "pg_upmig_admin",
    queryMethod: "raw",
    connectMethod: null,
    endMethod: "destroy"
  },
  client
});

// Perform pending migrations till the first "critical" migration
// Could be the last migration before a breaking change
async function migrateTillCritical () {
  const migrate = await migration.pending();

  const critical = migrate.pending.find(item => /critical/i.test(item.name));

  const options = {};

  if (critical) {
    options.to = critical.ts;
  }

  return migration.up(options);
}

...

// async/await
async function customFunction () {
  // some stuff

  // try-catch is somewhere anyhow =D
  const performedMigrations = await migrateTillCritical();

  // we are done
  migration.release();
}

// or using promise
function customFunction () {
  migrateTillCritical()
  .then((performedMigrations) => {
    // do something...
  })
  .catch((error) => {
    // log error
  })
  .finally(() => {
    // we are done
    migrations.release();
  });
}
```

#### pg-upmig.create(name[, nosql])
*Promise*

Creates timestamped migration files (sql file creation is avoided when `nosql` is `true`) using `template.stub` as a template. Filename collision is handled even if this case should not happen.

Returns the full name of created file :
`1600775947530_create-table`

#### pg-upmig.pending([options])
*Promise*

Lists pending migrations. [`options`](#global-options) is optionnal.

Returns an object:
|Key|Type|Description|
|-|-|-|
|pending|array|Array of objects representing pending migrations files.
|pending[].filename|string|Pending migration filename without extension.|
|pending[].ts|number|Pending migration timestamp.|
|pending[].name|string|Pending migration name excluding timestamp.|
|last|object|Latest migration performed|
|last.ts|number|Latest migration timestamp.|
|last.name|string|Latest migration name excluding timestamp.|
|history|number|Number of performed migrations.|

#### pg-upmig.up([options])
*Promise*

Performs pending migrations till number of steps or timestamp isn't reached. [`options`](#global-options) is optionnal.

Specific options
|Key|Type|Description|
|-|-|-|
|steps|number|Limits how many pending migrations to perform. When used with `to`, stops on the first condition reached.|
|to|number|Define a timestamp (part of migration filname) up where to perform pending migrations. When used with `to`, stops on the first condition reached|

Returns an array of objects representing migration file:
|Key|Type|Description|
|-|-|-|
|filename|string|Migration filename without extension.|
|ts|number|Migration timestamp.|
|name|string|Migration name excluding timestamp.|
## Todo
- [ ] Custom logger implementation
- [x] Remove dispensable dependencies