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
            await connection.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp VARCHAR(255) AFTER password`);
            await connection.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry BIGINT AFTER otp`);
            await connection.query(`CREATE TABLE IF NOT EXISTS services (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2), duration INT, category VARCHAR(100), description TEXT, image TEXT)`);
            await connection.query(`CREATE TABLE IF NOT EXISTS bookings (id INT AUTO_INCREMENT PRIMARY KEY, user_email VARCHAR(255), service_name VARCHAR(255), price DECIMAL(10,2), date DATE, time TIME, status ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') DEFAULT 'Pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await connection.query(`CREATE TABLE IF NOT EXISTS otp_verification (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL, otp VARCHAR(255) NOT NULL, expiry BIGINT NOT NULL, is_verified BOOLEAN DEFAULT FALSE, attempts INT DEFAULT 0, last_sent BIGINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            console.log("✅ Database tables created");
            
            const [admins] = await connection.query("SELECT * FROM users WHERE email = 'admin@glamoroussalon.com' LIMIT 1");
            const hashedPassword = await bcrypt.hash('admin123', 8);
            if (admins.length === 0) {
                await connection.query(
                    "INSERT INTO users (first_name, last_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)",
                    ['Admin', 'User', 'admin@glamoroussalon.com', '9999999999', hashedPassword, 'admin']
                );
                console.log("✅ Admin user created");
            } else {
                await connection.query("UPDATE users SET password = ? WHERE email = 'admin@glamoroussalon.com'", [hashedPassword]);
                console.log("✅ Admin password reset");
            }
            
            const [services] = await connection.query("SELECT COUNT(*) as count FROM services");
            if (services[0].count === 0) {
                const defaultServices = [
                    ['Architectural Cut', 1200, 45, 'Artistry', 'Elite treatment using our signature techniques.', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&fit=crop'],
                    ['Molecular Facial', 2500, 60, 'Therapy', 'Advanced facials using cellular-level technology.', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&fit=crop'],
                    ['Signature Balayage', 4500, 120, 'Signature', 'The definition of luxury color.', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&fit=crop'],
                    ['Bridal Artistry', 5000, 180, 'Artistry', 'Red-carpet ready makeup for your special moments.', 'https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=600&fit=crop'],
                    ['Organic Head Spa', 1800, 60, 'Therapy', 'Organic, cruelty-free formulas that nourish.', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&fit=crop'],
                    ['Premium Gold Facial', 3000, 90, 'Signature', '24K gold-infused facial for the ultimate radiance.', 'https://images.unsplash.com/photo-1512290923902-8a9f81dc2069?w=600&fit=crop']
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
