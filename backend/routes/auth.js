const express = require("express");
const router = express.Router();
const { Resend } = require("resend");
const bcrypt = require("bcryptjs");
const db = require("../db");

const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const [user] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiry = Date.now() + 5 * 60 * 1000;

    // Delete old OTPs for this email first
    await db.query("DELETE FROM otp_verification WHERE email = ?", [email]);
    
    await db.query(
      "INSERT INTO otp_verification (email, otp, expiry, is_verified) VALUES (?, ?, ?, FALSE)",
      [email, otp, expiry]
    );

    await resend.emails.send({
      from: "Glamorous Salon <onboarding@resend.dev>",
      to: email,
      subject: "Password Reset OTP - Glamorous Salon",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #e91e63;">Glamorous Salon - Password Reset</h2>
          <p>Your verification code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 5px; color: #333;">${otp}</h1>
          <p>This OTP will expire in <strong>5 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("Send OTP Error:", err);
    res.status(500).json({ message: "Error sending OTP: " + err.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Delete all expired OTPs first
    await db.query("DELETE FROM otp_verification WHERE expiry < ?", [Date.now()]);

    const [records] = await db.query("SELECT * FROM otp_verification WHERE email = ? AND is_verified = FALSE ORDER BY create_at DESC LIMIT 1", [email]);

    if (records.length === 0) {
      return res.status(400).json({ message: "No OTP found or already verified" });
    }

    const record = records[0];
    if (Date.now() > record.expiry) {
      // Delete expired OTP immediately
      await db.query("DELETE FROM otp_verification WHERE id = ?", [record.id]);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await db.query("UPDATE otp_verification SET is_verified = TRUE WHERE id = ?", [record.id]);

    res.json({ message: "OTP verified" });

  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "Error verifying OTP: " + err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const [records] = await db.query("SELECT * FROM otp_verification WHERE email = ? AND is_verified = TRUE ORDER BY created_at DESC LIMIT 1", [email]);
    
    if (records.length === 0) {
      return res.status(403).json({ message: "Access denied. Verify OTP first." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);
    await db.query("DELETE FROM otp_verification WHERE email = ?", [email]);

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Error updating password: " + err.message });
  }
});

module.exports = router;
