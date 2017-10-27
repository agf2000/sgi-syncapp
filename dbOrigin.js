var mssql = require("mssql");
var dbConfig = {
    user: "sa",
    password: "sa",
    server: "127.0.0.1\\sqlexpress",
    database: "babe",
    port: 1433,
    connectionTimeout: 500000,
    requestTimeout: 500000,
    pool: {
        idleTimeoutMillis: 500000,
        max: 100
    }
};

var connection = new mssql.ConnectionPool(dbConfig, function (err) {
    if (err)
        throw err;
});

module.exports = connection;