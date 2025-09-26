// database.js
// Shared MySQL pools for both databases (Node 18 + mysql2/promise)
const mysql = require("mysql2/promise");
const cfg = require("./db-details");

const pools = {
  orders: mysql.createPool({
    host: cfg.mysqlHost, port: cfg.mysqlPort,
    user: cfg.mysqlUser, password: cfg.mysqlPassword,
    database: cfg.dbOrders, waitForConnections: true,
    connectionLimit: 10, queueLimit: 0
  }),
  quotes: mysql.createPool({
    host: cfg.mysqlHost, port: cfg.mysqlPort,
    user: cfg.mysqlUser, password: cfg.mysqlPassword,
    database: cfg.dbQuotes, waitForConnections: true,
    connectionLimit: 10, queueLimit: 0
  })
};

module.exports = {
  pools,
  getPool(name){ return pools[name]; }
};
