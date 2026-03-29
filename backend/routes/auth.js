const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

let otpStore = {}; // temporary (use DB in production)

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ SEND OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = otp;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      html: `<h2>Your OTP is: ${otp}</h2>`,
    });

    res.json({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("OTP ERROR:", error);
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


// ✅ RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // TODO: update password in DB
    res.json({ message: "Password updated successfully" });

  } catch (err) {
    res.status(500).json({ message: "Error updating password" });
  }
});

module.exports = router;
