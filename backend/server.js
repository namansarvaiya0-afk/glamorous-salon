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
    .then(async connection => {
        console.log("✅ DB Connected Successfully");
        
        try {
            await connection.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, first_name VARCHAR(255), last_name VARCHAR(255), email VARCHAR(255) UNIQUE, phone VARCHAR(20), password VARCHAR(255), role ENUM('client', 'admin') DEFAULT 'client', otp VARCHAR(255), otp_expiry BIGINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await connection.query(`ALTER TABLE users ADD COLUMN otp VARCHAR(255) AFTER password`).catch(() => {});
            await connection.query(`ALTER TABLE users ADD COLUMN otp_expiry BIGINT AFTER otp`).catch(() => {});
            await connection.query(`CREATE TABLE IF NOT EXISTS services (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2), duration INT, category VARCHAR(100), description TEXT, image TEXT)`);
            await connection.query(`CREATE TABLE IF NOT EXISTS bookings (id INT AUTO_INCREMENT PRIMARY KEY, user_email VARCHAR(255), service_name VARCHAR(255), price DECIMAL(10,2), date DATE, time TIME, status ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') DEFAULT 'Pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await connection.query(`CREATE TABLE IF NOT EXISTS otp_verification (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL, otp VARCHAR(255) NOT NULL, expiry BIGINT NOT NULL, is_verified BOOLEAN DEFAULT FALSE, attempts INT DEFAULT 0, last_sent BIGINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            console.log("✅ Database tables created");
            
            const hashedPassword = await bcrypt.hash('admin@123', 8);
            
            // Delete existing admin users
            await connection.query("DELETE FROM users WHERE email = 'admin' OR email = 'admin@glamoroussalon.com'");
            
            // Create new admin
            await connection.query(
                "INSERT INTO users (first_name, last_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)",
                ['Admin', 'User', 'admin', '9999999999', hashedPassword, 'admin']
            );
            console.log("✅ Admin credentials updated");
            
            const [services] = await connection.query("SELECT COUNT(*) as count FROM services");
            if (services[0].count === 0) {
                const defaultServices = [
                    ['Bridal Makeup', 3500, 180, 'Artistry', 'Full bridal makeup with premium products for your special day', 'https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=600&fit=crop'],
                    ['Party Makeup', 2500, 90, 'Artistry', 'Glamorous party makeup with HD finish', 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&fit=crop'],
                    ['Engagement Makeup', 2000, 60, 'Artistry', 'Elegant engagement makeup look', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&fit=crop'],
                    ['Facial', 1000, 45, 'Therapy', 'Rejuvenating facial treatment for glowing skin', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&fit=crop'],
                    ['Hair Styling', 800, 45, 'Artistry', 'Professional hair styling for any occasion', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&fit=crop'],
                    ['Bleach', 500, 30, 'Therapy', 'Full body bleach treatment', 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=600&fit=crop'],
                    ['Waxing', 400, 30, 'Therapy', 'Full body waxing service', 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=600&fit=crop'],
                    ['Manicure', 400, 30, 'Therapy', 'Luxurious manicure treatment', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&fit=crop'],
                    ['Pedicure', 400, 30, 'Therapy', 'Relaxing pedicure treatment', 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?w=600&fit=crop'],
                    ['De-Tan', 600, 45, 'Therapy', 'Full body de-tan treatment', 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=600&fit=crop'],
                    ['Body Spa', 2500, 120, 'Therapy', 'Full body relaxing spa treatment', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&fit=crop'],
                    ['Hair Spa', 1500, 60, 'Therapy', 'Deep conditioning hair spa', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&fit=crop'],
                    ['Nail Extension', 1200, 90, 'Artistry', 'Professional nail extension service', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&fit=crop'],
                    ['Platinum Package', 3500, 180, 'Package', 'Complete beauty package - Facial + Manicure + Pedicure + Hair Styling', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&fit=crop'],
                    ['Gold Package', 2500, 120, 'Package', 'Gold beauty package - Facial + Manicure + Pedicure', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&fit=crop'],
                    ['Silver Package', 1500, 90, 'Package', 'Basic package - Facial + Manicure', 'https://images.unsplash.com/photo-1512290923902-8a9f81dc2069?w=600&fit=crop'],
                    ['Makeover Package', 8000, 240, 'Signature', 'Complete makeover - Bridal Makeup + Hair Styling + Manicure + Pedicure + Body Spa', 'https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=800&fit=crop'],
                    ['Premium Spa', 6000, 180, 'Signature', 'Premium spa experience - Body Spa + Hair Spa + Facial + De-Tan', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&fit=crop'],
                    ['Full Body Detan', 4000, 150, 'Therapy', 'Complete de-tan treatment - Full Body bleach + De-Tan + Facial', 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=800&fit=crop']
                ];
                for (const service of defaultServices) {
                    await connection.query(
                        "INSERT INTO services (name, price, duration, category, description, image) VALUES (?, ?, ?, ?, ?, ?)",
                        service
                    );
                }
                console.log("✅ Default services created");
            }
        } catch (err) {
            console.error("❌ Setup error:", err.message);
        }
        
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

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ type: '*/*' }));

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

// Auth: Login
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Login attempt:", email);

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

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            'GLAMOUR_SECRET',
            { expiresIn: '7d' }
        );

        return res.json({
            success: true,
            message: "Login successful",
            token: token,
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
app.post('/api/bookings', async (req, res) => {
    try {
        const { userEmail, serviceName, price, date, time, paymentId, paymentMethod } = req.body;
        
        if (!userEmail || !serviceName || !date || !time) {
            return res.status(400).json({ success: false, error: 'Please provide all required fields' });
        }
        
        const status = paymentMethod === 'pay_at_salon' ? 'Pending' : 'Confirmed';
        const finalPrice = parseFloat(price) || 0;
        const [result] = await db.query(
            'INSERT INTO bookings (user_email, service_name, price, date, time, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userEmail, serviceName, finalPrice, date, time, status]
        );
        
        res.status(201).json({ success: true, message: 'Booking confirmed', id: result.insertId });
    } catch (err) {
        console.error('Booking Error:', err);
        res.status(500).json({ success: false, error: 'Booking failed. Please try again.' });
    }
});

app.get('/api/user/bookings', async (req, res) => {
    try {
        const email = req.query.email;
        const [results] = await db.query('SELECT * FROM bookings WHERE user_email = ?', [email]);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
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

// har 1 min me expired OTP cleanup
cron.schedule("* * * * *", () => {
    const now = Date.now();
    if (typeof db !== 'undefined' && db) {
        db.query("DELETE FROM otp_verification WHERE expiry < ?", [now])
            .then((result) => {
                if (result[0].affectedRows > 0) {
                    console.log(`Removed ${result[0].affectedRows} expired OTPs from database`);
                }
            })
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
