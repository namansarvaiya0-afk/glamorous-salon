const express = require("express");
const router = express.Router();
const { Resend } = require("resend");
const bcrypt = require("bcryptjs"); // Used bcryptjs as per package.json
const db = require("../db");

const resend = new Resend(process.env.RESEND_API_KEY);


// ✅ SEND OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const [user] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    await db.query(
      "UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?",
      [otp, expiry, email]
    );

    // If using resend domain, update the 'from' email accordingly
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #ff3366;">Password Reset</h2>
          <p>Your verification code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 5px; color: #333;">${otp}</h1>
          <p>This OTP will expire in <strong>5 minutes</strong>.</p>
        </div>
      `,
    });

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});


// ✅ VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const [user] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const storedOtp = user[0].otp;
    const expiry = user[0].otp_expiry;

    if (!storedOtp) {
      return res.status(400).json({ message: "No OTP found" });
    }

    if (Date.now() > expiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (storedOtp != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    res.json({ message: "OTP verified" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
});


// ✅ RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET password = ?, otp = NULL, otp_expiry = NULL WHERE email = ?",
      [hashedPassword, email]
    );

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating password" });
  }
});

module.exports = router;
