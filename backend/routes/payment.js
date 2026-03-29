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
      // ✅ 1. Update booking to success
      const [booking] = await db.query("SELECT email, service FROM bookings WHERE order_id = ?", [razorpay_order_id]);
      
      await db.query(
        "UPDATE bookings SET payment_id=?, status=? WHERE order_id=?",
        [razorpay_payment_id, "paid", razorpay_order_id]
      );

      // ✅ 2. Send confirmation email
      if (booking.length > 0) {
        await resend.emails.send({
          from: "onboarding@resend.dev",
          to: booking[0].email,
          subject: "Booking Confirmed",
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #e91e63;">Luxury Experience Secured!</h2>
              <p>Your booking for <strong>${booking[0].service}</strong> has been successfully confirmed.</p>
              <p>Order ID: ${razorpay_order_id}</p>
              <p>Payment ID: ${razorpay_payment_id}</p>
              <br>
              <p>Thank you for choosing Glamorous Salon.</p>
            </div>
          `
        });
      }

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
