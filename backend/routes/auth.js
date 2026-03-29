const express = require("express");
const router = express.Router();
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// temporary store (later DB use karenge)
let otpStore = {};

// ✅ SEND OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;

    console.log("OTP:", otp);

    await resend.emails.send({
      from: "onboarding@resend.dev", // default working sender
      to: email,
      subject: "Password Reset OTP",
      html: `<h2>Your OTP is: ${otp}</h2><p>This OTP is valid for 5 minutes.</p>`,
    });

    res.json({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("RESEND ERROR:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});


// ✅ VERIFY OTP
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (otpStore[email] == otp) {
    res.json({ message: "OTP verified" });
  } else {
    res.status(400).json({ message: "Invalid OTP" });
  }
});


// ✅ RESET PASSWORD (MYSQL example)
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const db = require("../db"); // your DB connection

    await db.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [newPassword, email]
    );

    delete otpStore[email];

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating password" });
  }
});

module.exports = router;
