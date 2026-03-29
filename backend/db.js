const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "glamorous_salon",
});

db.connect((err) => {
  if (err) {
    console.error("❌ DB CONNECTION ERROR:", err);
  } else {
    console.log("✅ DB CONNECTED");
  }
});

module.exports = db.promise(); // Using .promise() so await db.query() works
