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
      from: "Parivar Mart <onboarding@resend.dev>",
      to: email,
      subject: "Password Reset OTP - Parivar Mart",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background: #f0fdf4;">
          <div style="text-align: center; margin-bottom: 25px;">
            <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #16a34a, #15803d); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 32px;">🛒</span>
            </div>
            <h2 style="color: #15803d; margin: 0; font-size: 24px;">Parivar Mart</h2>
            <p style="color: #64748b; margin: 5px 0 0; font-size: 14px;">Your Trusted Grocery Partner</p>
          </div>
          
          <div style="background: white; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 20px;">
            <p style="color: #1e293b; margin: 0 0 15px; font-size: 16px;">Your password reset verification code is:</p>
            <h1 style="font-size: 42px; letter-spacing: 12px; color: #16a34a; margin: 0; font-weight: 700;">${otp}</h1>
            <p style="color: #ef4444; font-size: 13px; margin: 20px 0 0;">⏰ This OTP will expire in <strong>5 minutes</strong></p>
          </div>
          
          <p style="color: #64748b; font-size: 13px; text-align: center; margin: 0;">If you didn't request this password reset, please ignore this email.</p>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2024 Parivar Mart. All rights reserved.</p>
          </div>
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
