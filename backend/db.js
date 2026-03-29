const mysql = require("mysql2/promise");

let db;

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
};

if (process.env.MYSQL_PUBLIC_URL) {
  db = mysql.createPool(process.env.MYSQL_PUBLIC_URL);
} else {
  db = mysql.createPool(dbConfig);
}

module.exports = db;
