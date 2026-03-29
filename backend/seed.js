const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function seedUser() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "glamorous_salon",
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log("Starting DB Ritual... 🕯️");
    
    // Check if user already exists
    const [rows] = await db.query("SELECT * FROM users WHERE email = 'test@glamorous.com'");
    
    if (rows.length > 0) {
      console.log("✨ Test user 'test@glamorous.com' already exists.");
    } else {
      const hashedPassword = await bcrypt.hash("Pass123!", 10);
      await db.query(
        "INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)",
        ["Elena", "Luxury", "test@glamorous.com", hashedPassword, "client"]
      );
      console.log("✅ Successfully created test user: test@glamorous.com / Pass123!");
    }

  } catch (err) {
    console.error("❌ RITUAL FAILED:", err.message);
    if (err.code === 'ECONNREFUSED') {
      console.log("👉 Make sure your MySQL (XAMPP/WAMP) is running on port 3306.");
    }
  } finally {
    process.exit();
  }
}

seedUser();
