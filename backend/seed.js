const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const blackbookServices = [
  // Individual Services
  ['Bridal Makeup', 6000, 180, 'Artistry', 'Full bridal makeup with premium products for your special day', 'https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=600&fit=crop'],
  ['Party Makeup', 1500, 90, 'Artistry', 'Glamorous party makeup with HD finish', 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&fit=crop'],
  ['Engagement Makeup', 3000, 60, 'Artistry', 'Elegant engagement makeup look', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&fit=crop'],
  ['Facial', 600, 45, 'Therapy', 'Rejuvenating facial treatment for glowing skin', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&fit=crop'],
  ['Hair Styling', 400, 45, 'Artistry', 'Professional hair styling for any occasion', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&fit=crop'],
  ['Bleach', 300, 30, 'Therapy', 'Full body bleach treatment', 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=600&fit=crop'],
  ['Waxing', 250, 30, 'Therapy', 'Full body waxing service', 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=600&fit=crop'],
  ['Manicure', 250, 30, 'Therapy', 'Luxurious manicure treatment', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&fit=crop'],
  ['Pedicure', 250, 30, 'Therapy', 'Relaxing pedicure treatment', 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?w=600&fit=crop'],
  ['De-Tan', 400, 45, 'Therapy', 'Full body de-tan treatment', 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=600&fit=crop'],
  ['Body Spa', 1500, 120, 'Therapy', 'Full body relaxing spa treatment', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&fit=crop'],
  ['Hair Spa', 800, 60, 'Therapy', 'Deep conditioning hair spa', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&fit=crop'],
  ['Nail Extension', 600, 90, 'Artistry', 'Professional nail extension service', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&fit=crop'],
  // Packages
  ['Platinum Package', 2500, 180, 'Package', 'Complete beauty package - Facial + Manicure + Pedicure + Hair Styling', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&fit=crop'],
  ['Gold Package', 1800, 120, 'Package', 'Gold beauty package - Facial + Manicure + Pedicure', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&fit=crop'],
  ['Silver Package', 1000, 90, 'Package', 'Basic package - Facial + Manicure', 'https://images.unsplash.com/photo-1512290923902-8a9f81dc2069?w=600&fit=crop'],
  // Combo Packages
  ['Makeover Package', 5000, 240, 'Signature', 'Complete makeover - Bridal Makeup + Hair Styling + Manicure + Pedicure + Body Spa', 'https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=800&fit=crop'],
  ['Premium Spa', 3500, 180, 'Signature', 'Premium spa experience - Body Spa + Hair Spa + Facial + De-Tan', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&fit=crop'],
  ['Full Body Detan', 2500, 150, 'Therapy', 'Complete de-tan treatment - Full Body bleach + De-Tan + Facial', 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=800&fit=crop']
];

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

    // Add Blackbook services
    console.log("\n📋 Adding Blackbook Services...");
    for (const service of blackbookServices) {
      const [existing] = await db.query("SELECT id FROM services WHERE name = ?", [service[0]]);
      if (existing.length === 0) {
        await db.query(
          "INSERT INTO services (name, price, duration, category, description, image) VALUES (?, ?, ?, ?, ?, ?)",
          service
        );
        console.log(`   ✅ Added: ${service[0]} - ₹${service[1]}`);
      } else {
        console.log(`   ⏭️  Skipped (exists): ${service[0]}`);
      }
    }

    console.log("\n🎉 Blackbook Services Added Successfully!");

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
