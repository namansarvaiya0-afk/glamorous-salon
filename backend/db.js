const mysql = require("mysql2/promise");

let pool;

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
  pool = mysql.createPool(process.env.MYSQL_PUBLIC_URL);
} else {
  pool = mysql.createPool(dbConfig);
}

module.exports = pool;
