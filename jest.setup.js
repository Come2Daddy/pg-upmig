const fs = require("fs");

module.exports = async () => {
    try {
        (await fs.promises.readFile(".env")) // read config file
        .toString("utf8") // buffer to string
        .split(/\n|\r|\r/) // break by new line
        .filter(item => /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.test(item)) // keep key / val
        .map(item => {
            const match = item.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (!Object.prototype.hasOwnProperty.call(process.env, match[1])) process.env[match[1]] = match[2].replace(/^("|')(.*)\1$/, "$2"); // set env
        });
    } catch (error) {}
};