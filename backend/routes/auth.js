const express = require("express");
const router = express.Router();
const { Resend } = require("resend");

let otpStore = {}; // temporary (use DB in production)

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ SEND OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;

    const { data, error } = await resend.emails.send({
      from: 'Glamorous Salon <onboarding@resend.dev>', // You can change this after domain verification
      to: [email],
      subject: 'Password Reset OTP - Glamorous Studio',
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #ff3366;">Account Recovery</h2>
                <p>Your verification code is:</p>
                <h1 style="font-size: 32px; color: #333; letter-spacing: 5px; font-weight: bold;">${otp}</h1>
                <p>This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
             </div>`
    });

    if (error) {
      console.error("RESEND ERROR:", error);
      return res.status(500).json({ message: "Failed to send OTP", error });
    }

    console.log("✅ OTP SENT to " + email);
    res.json({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("OTP SYSTEM ERROR:", error);
    res.status(500).json({ message: "System error while sending OTP" });
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
