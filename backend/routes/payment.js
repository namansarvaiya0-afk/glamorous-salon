const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const { Resend } = require("resend");
const db = require("../db");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Create Order + store temp booking
router.post("/create-order", async (req, res) => {
  try {
    const { email, service, amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // INR to paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json(order);

  } catch (err) {
    console.error("Razorpay Error:", err);
    res.status(500).json({ message: "Order failed: " + err.message });
  }
});

// ✅ Verify Payment Signature + Confirm Booking
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }

  } catch (err) {
    console.error("Verify Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
