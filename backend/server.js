require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const db = require("./db");

db.getConnection()
    .then(connection => {
        console.log("✅ DB Connected Successfully");
        connection.release();
    })
    .catch(err => {
        console.error("❌ DB Connection Failed:", err.message);
    });

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// OTP Generator
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
app.use('/api', authRoutes);
app.use('/api/payment', paymentRoutes);

// Default route (homepage)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});
const DB_JSON_PATH = path.join(__dirname, 'db.json');

// Function to handle JSON file operations
const getJsonData = () => JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
const saveJsonData = (data) => fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2));

// Unified Query Helper
const executeQuery = (sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    
    db.query(sql, params)
        .then(([results]) => {
            if (callback) callback(null, results);
        })
        .catch(err => {
            if (callback) callback(err);
        });
};

// Middleware
// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// --- API ROUTES ---

// Authenticate User
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).send({ error: 'Authentication required' });
    try {
        const decoded = jwt.verify(token, 'GLAMOUR_SECRET');
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Please login again' });
    }
};

// Authenticate Admin
const authenticateAdmin = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).send({ error: 'Please authenticate as admin' });
    try {
        const decoded = jwt.verify(token, 'GLAMOUR_SECRET');
        if (decoded.role !== 'admin') throw new Error();
        req.admin = decoded;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Invalid admin credentials' });
    }
};

// Auth: Login - Fully Safe Version
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "All fields required" });
        }

        const [rows] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (!rows || rows.length === 0) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }

        return res.json({
            success: true,
            message: "Login successful",
            user: { id: user.id, email: user.email, first_name: user.first_name, role: user.role }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
});



// OTP routes are now handled in ./routes/auth.js




// --- Auth: Register ---
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, phone, password } = req.body;

    // Validate phone number (exactly 10 digits)
    if (!/^\d{10}$/.test(phone)) {
        return res.status(400).send({ error: 'Phone number must be exactly 10 digits' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    executeQuery('INSERT INTO users (first_name, last_name, email, phone, password) VALUES (?, ?, ?, ?, ?)',
        [firstName, lastName, email, phone, hashedPassword], (err, results) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY' || err.message.includes('unique')) return res.status(400).send({ error: 'Email already exists' });
                return res.status(500).send(err);
            }
            res.status(201).send({ message: 'User registered successfully' });
        });
});

// Services: Get All
app.get('/api/services', (req, res) => {
    executeQuery('SELECT * FROM services', (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

// Admin: Manage Services
app.post('/api/admin/services', authenticateAdmin, (req, res) => {
    const { name, price, duration, category, description, image } = req.body;
    executeQuery('INSERT INTO services (name, price, duration, category, description, image) VALUES (?, ?, ?, ?, ?, ?)',
        [name, price, duration, category, description, image], (err, results) => {
            if (err) return res.status(500).send(err);
            res.status(201).send({ id: results.insertId });
        });
});

app.put('/api/admin/services/:id', authenticateAdmin, (req, res) => {
    const { name, price, duration, category, description, image } = req.body;
    executeQuery('UPDATE services SET name=?, price=?, duration=?, category=?, description=?, image=? WHERE id=?',
        [name, price, duration, category, description, image, req.params.id], (err) => {
            if (err) return res.status(500).send(err);
            res.send({ message: 'Service updated' });
        });
});

app.delete('/api/admin/services/:id', authenticateAdmin, (req, res) => {
    executeQuery('DELETE FROM services WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.send({ message: 'Service deleted' });
    });
});

// Admin: Manage Bookings
app.get('/api/admin/bookings', authenticateAdmin, (req, res) => {
    executeQuery('SELECT * FROM bookings ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

app.put('/api/admin/bookings/:id', authenticateAdmin, (req, res) => {
    const { status } = req.body;
    executeQuery('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.send({ message: 'Booking status updated' });
    });
});

// Admin: Manage Users
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    executeQuery('SELECT id, first_name, last_name, email, phone, role as role_val, created_at FROM users', (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

app.get('/api/clients', (req, res) => {
    executeQuery('SELECT first_name as name, email FROM users', (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

// Bookings
app.post('/api/bookings', (req, res) => {
    const { userEmail, serviceName, price, date, time } = req.body;
    executeQuery('INSERT INTO bookings (user_email, service_name, price, date, time) VALUES (?, ?, ?, ?, ?)',
        [userEmail, serviceName, price, date, time], (err, results) => {
            if (err) return res.status(500).send(err);
            res.status(201).send({ message: 'Booking confirmed', id: results.insertId });
        });
});

app.get('/api/user/bookings', (req, res) => {
    const email = req.query.email;
    executeQuery('SELECT * FROM bookings WHERE user_email = ?', [email], (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

app.put('/api/bookings/:id/cancel', authenticateToken, (req, res) => {
    // Check if the booking belongs to the user
    executeQuery('SELECT user_email FROM bookings WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send({ error: 'Booking not found' });

        if (results[0].user_email !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).send({ error: 'Permission denied' });
        }

        executeQuery('UPDATE bookings SET status = "Cancelled" WHERE id = ?', [req.params.id], (err2) => {
            if (err2) return res.status(500).send(err2);
            res.send({ message: 'Booking cancelled' });
        });
    });
});

// Static Routes (SPA-like or Simple Serve)
app.get('*', (req, res) => {
    const filePath = req.path === '/' ? 'index.html' : req.path;
    if (filePath.includes('.')) {
        res.sendFile(path.join(__dirname, "../public", filePath));
    } else {
        res.sendFile(path.join(__dirname, "../public", filePath + '.html'));
    }
});

// har 5 min me cleanup
cron.schedule("*/5 * * * *", () => {
    const now = Date.now();
    if (typeof db !== 'undefined' && db) {
        db.query("DELETE FROM otp_verification WHERE expiry < ?", [now])
            .then(() => console.log("Removed expired OTPs from database"))
            .catch(err => console.error("Cron OTP DB cleanup error:", err.message));
    }
});

function startServer(port) {
    const server = app.listen(port, HOST, () => {
        console.log(`Server running on ${HOST}:${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
}

startServer(PORT);
