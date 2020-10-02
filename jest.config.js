module.exports = {
    globalSetup: "./jest.setup.js",
    collectCoverage: true,
    collectCoverageFrom: [
        "**/*.{js,jsx}",
        "!**/coverage/**",
        "!**/node_modules/**",
        "!**/tests/cmd.js",
        "!*.js"
    ]
}