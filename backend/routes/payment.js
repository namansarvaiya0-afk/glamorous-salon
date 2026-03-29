const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const db = require("../db");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Order + store temp booking
router.post("/create-order", async (req, res) => {
  try {
    const { name, email, service, amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // INR to paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    // Save booking as pending
    await db.query(
      "INSERT INTO bookings (name, email, service, amount, order_id, status) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, service, amount, order.id, "pending"]
    );

    res.json(order);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Order failed" });
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
      // ✅ Update booking to success
      await db.query(
        "UPDATE bookings SET payment_id=?, status=? WHERE order_id=?",
        [razorpay_payment_id, "paid", razorpay_order_id]
      );

      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
