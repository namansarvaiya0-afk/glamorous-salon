const mysql = require("mysql2");

const db = mysql.createPool(process.env.MYSQL_PUBLIC_URL || {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "glamorous_salon",
  port: process.env.DB_PORT || 3306,
});

module.exports = db.promise();
