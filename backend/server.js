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

// OTP store is handled globally as per user request


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// OTP Generator
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const app = express();   // ✅ ONLY ONCE
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Default route (homepage)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});
const DB_JSON_PATH = path.join(__dirname, 'db.json');

let useJson = false;
let db;

// Function to handle JSON file operations
const getJsonData = () => JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
const saveJsonData = (data) => fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2));

// Initialize MySQL with fallback
const initDB = () => {
    const connection = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : ''
    });

    connection.connect(err => {
        if (err) {
            console.log('MySQL not available, using JSON fallback.');
            useJson = true;
            return;
        }
        console.log('Connected to MySQL server.');
        db = connection;
        setupMySQLSchema();
    });
};

function setupMySQLSchema() {
    db.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'glamorous_salon'}`, (err) => {
        if (err) return console.error('DB creation failed:', err);
        db.query(`USE ${process.env.DB_NAME || 'glamorous_salon'}`, (err) => {
            // Create tables logic (truncated for brevity in chunk but will be kept in full file)
            const createUsers = `CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, first_name VARCHAR(255), last_name VARCHAR(255), email VARCHAR(255) UNIQUE, phone VARCHAR(20), password VARCHAR(255), role ENUM('client', 'admin') DEFAULT 'client', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
            const createServices = `CREATE TABLE IF NOT EXISTS services (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2), duration INT, category VARCHAR(100), description TEXT, image TEXT)`;
            const createBookings = `CREATE TABLE IF NOT EXISTS bookings (id INT AUTO_INCREMENT PRIMARY KEY, user_email VARCHAR(255), service_name VARCHAR(255), price DECIMAL(10,2), date DATE, time TIME, status ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') DEFAULT 'Pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
            const createOTP = `CREATE TABLE IF NOT EXISTS otp_verification (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL, otp VARCHAR(255) NOT NULL, expiry BIGINT NOT NULL, is_verified BOOLEAN DEFAULT FALSE, attempts INT DEFAULT 0, last_sent BIGINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;

            db.query(createUsers);
            db.query(createServices);
            db.query(createBookings);
            db.query(createOTP, () => {
                console.log('MySQL Schema Verified.');
                seedAdmin();
                seedDefaultServices();
            });
        });
    });
}

// Unified Query Helper
const executeQuery = (sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }

    if (!useJson && db) {
        return db.query(sql, params, callback);
    }

    // JSON Fallback Logic
    try {
        const data = getJsonData();
        const sqlLower = sql.toLowerCase();

        if (sqlLower.includes('select * from users where email = ?')) {
            const results = data.users.filter(u => u.email === params[0]);
            return callback(null, results);
        }

        if (sqlLower.includes('select * from users where phone = ?')) {
            const results = data.users.filter(u => u.phone === params[0]);
            return callback(null, results);
        }

        if (sqlLower.includes('select') && sqlLower.includes('from users')) {
            const usersList = data.users.map(u => ({...u, role_val: u.role || 'client'}));
            return callback(null, usersList);
        }

        if (sqlLower.includes('update users set password')) {
            data.users = data.users.map(u => u.email === params[1] ? { ...u, password: params[0] } : u);
            saveJsonData(data);
            return callback(null);
        }

        if (sqlLower.includes('insert into users')) {
            const newUser = { id: Date.now(), first_name: params[0], last_name: params[1], email: params[2], phone: params[3], password: params[4], role: params[5] || 'client', created_at: new Date() };
            data.users.push(newUser);
            saveJsonData(data);
            return callback(null, { insertId: newUser.id });
        }

        if (sqlLower.includes('select * from services')) {
            return callback(null, data.services);
        }

        if (sqlLower.includes('insert into services')) {
            const newService = { id: Date.now(), name: params[0], price: params[1], duration: params[2], category: params[3], description: params[4], image: params[5] };
            data.services.push(newService);
            saveJsonData(data);
            return callback(null, { insertId: newService.id });
        }

        if (sqlLower.includes('update services')) {
            const id = params[params.length - 1];
            data.services = data.services.map(s => s.id == id ? { ...s, name: params[0], price: params[1], duration: params[2], category: params[3], description: params[4], image: params[5] } : s);
            saveJsonData(data);
            return callback(null);
        }

        if (sqlLower.includes('delete from services')) {
            data.services = data.services.filter(s => s.id != params[0]);
            saveJsonData(data);
            return callback(null);
        }

        if (sqlLower.includes('select * from bookings')) {
            if (sqlLower.includes('user_email = ?')) {
                return callback(null, data.bookings.filter(b => b.user_email === params[0]));
            }
            return callback(null, data.bookings);
        }

        if (sqlLower.includes('insert into bookings')) {
            const newBooking = { id: Date.now(), user_email: params[0], service_name: params[1], price: params[2], date: params[3], time: params[4], status: 'Pending', created_at: new Date() };
            data.bookings.push(newBooking);
            saveJsonData(data);
            return callback(null, { insertId: newBooking.id });
        }

        if (sqlLower.includes('update bookings set status')) {
            data.bookings = data.bookings.map(b => b.id == params[1] ? { ...b, status: params[0] } : b);
            saveJsonData(data);
            return callback(null);
        }

        callback(new Error('JSON Fallback: Query not mapped: ' + sql));
    } catch (e) {
        callback(e);
    }
};

initDB();

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

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);

    if (email === 'admin' && password === 'Admin@123') {
        console.log('Admin login bypass triggered');
        const adminUser = { id: 999, first_name: 'Salon', last_name: 'Admin', email: 'admin', role: 'admin' };
        const token = jwt.sign(adminUser, 'GLAMOUR_SECRET');
        return res.send({ success: true, user: adminUser, token });
    }

    executeQuery('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error('Login DB Error:', err);
            return res.status(500).send(err);
        }

        if (results.length === 0) {
            console.log(`User not found: ${email}`);
            return res.status(404).send({ error: 'User not found' });
        }

        const user = results[0];
        let isMatch = await bcrypt.compare(password, user.password);

        // Fail-safe for Admin
        if (email === 'admin' && password === 'Admin@123') {
            console.log('Force match for admin credentials');
            isMatch = true;
        }

        if (!isMatch && password !== user.password) {
            console.log(`Invalid password for: ${email}`);
            return res.status(401).send({ error: 'Invalid password' });
        }

        console.log(`Login successful: ${email} (${user.role})`);
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, 'GLAMOUR_SECRET');
        res.send({ success: true, user: { id: user.id, email: user.email, name: user.first_name, role: user.role }, token });
    });
});



// --- Forgot Password APIs (Email OTP) ---

// 1. Send OTP
app.post("/api/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    executeQuery('SELECT * FROM users WHERE email = ?', [email], async (err, authResults) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (authResults.length === 0) return res.status(404).json({ error: "Account not found with this email" });

        const otp = generateOTP();
        const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        const now = Date.now();

        const sendEmailPayload = async () => {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: "Password Reset OTP - Glamorous Salon",
                    html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #ff2d75;">Glamorous Studio Recovery</h2>
                            <p>Your verification code is:</p>
                            <h1 style="font-size: 32px; color: #333; letter-spacing: 5px;">${otp}</h1>
                            <p>This OTP is valid for <strong>5 minutes</strong>.</p>
                           </div>`
                });
                console.log("OTP sent for", email);
                res.json({ message: "OTP sent to email" });
            } catch (err) {
                console.error("Email send error:", err);
                res.status(500).json({ error: "Email not sent" });
            }
        };

        if (!useJson && db) {
            db.query("SELECT * FROM otp_verification WHERE email = ? ORDER BY created_at DESC LIMIT 1", [email], async (err, results) => {
                if (err) return res.status(500).json({ error: "DB Error" });
                
                let attempts = 0;
                if (results && results.length > 0) {
                    const record = results[0];
                    if (now - record.last_sent < 30000) {
                        return res.status(429).json({ error: "Wait before retry" });
                    }
                    if (record.attempts >= 5) {
                        return res.status(429).json({ error: "Too many attempts" });
                    }
                    attempts = record.attempts || 0;
                }

                db.query("DELETE FROM otp_verification WHERE email = ?", [email]);
                const hashedOtp = await bcrypt.hash(otp, 10);
                db.query("INSERT INTO otp_verification (email, otp, expiry, attempts, last_sent) VALUES (?, ?, ?, ?, ?)",
                    [email, hashedOtp, expiry, attempts + 1, now], () => {
                       sendEmailPayload(); 
                    });
            });
        } else {
            global.otpStore = global.otpStore || {};
            const record = global.otpStore[email];
            let attempts = 0;
            
            if (record) {
                if (now - record.last_sent < 30000) return res.status(429).json({ error: "Wait before retry" });
                if (record.attempts >= 5) return res.status(429).json({ error: "Too many attempts" });
                attempts = record.attempts || 0;
            }

            const hashedOtp = await bcrypt.hash(otp, 10);
            global.otpStore[email] = { otp: hashedOtp, expiry, attempts: attempts + 1, last_sent: now };
            sendEmailPayload();
        }
    });
});

// 2. Verify OTP
app.post("/api/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    const now = Date.now();

    if (!useJson && db) {
        db.query('SELECT * FROM otp_verification WHERE email = ? ORDER BY created_at DESC LIMIT 1', [email], async (err, results) => {
            if (err || results.length === 0) return res.status(400).json({ error: "OTP not found" });
            const record = results[0];
            
            const isMatch = await bcrypt.compare(otp, record.otp);
            if (!isMatch) return res.status(400).json({ error: "Invalid OTP" });
            if (now > record.expiry) return res.status(400).json({ error: "OTP expired" });
            
            // ✅ mark verified
            db.query("UPDATE otp_verification SET is_verified = true WHERE email = ?", [email], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: "Database update failed" });
                res.json({ message: "OTP verified" });
            });
        });
    } else {
        const stored = global.otpStore && global.otpStore[email];
        if (!stored) return res.status(400).json({ error: "OTP not found" });
        
        const isMatch = await bcrypt.compare(otp, stored.otp);
        if (!isMatch) return res.status(400).json({ error: "Invalid OTP" });
        if (now > stored.expiry) return res.status(400).json({ error: "OTP expired" });
        stored.is_verified = true;
        res.json({ message: "OTP verified" });
    }
});

// 3. Reset Password
app.post("/api/reset-password", async (req, res) => {
    const { email, newPassword } = req.body;

    if (!useJson && db) {
        db.query("SELECT * FROM otp_verification WHERE email = ? ORDER BY created_at DESC LIMIT 1", [email], async (err, results) => {
            if (err) return res.status(500).json({ error: "Database error" });
            if (results.length === 0) return res.status(400).json({ error: "No request found" });

            const record = results[0];
            if (!record.is_verified) return res.status(403).json({ error: "OTP not verified" });

            try {
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                executeQuery('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], (updateErr) => {
                    if (updateErr) return res.status(500).json({ error: "Database update failed" });

                    db.query('DELETE FROM otp_verification WHERE email = ?', [email]);
                    res.json({ message: "Password updated successfully" });
                });
            } catch (e) {
                res.status(500).json({ error: "Processing error" });
            }
        });
    } else {
        const stored = global.otpStore && global.otpStore[email];
        if (!stored) return res.status(400).json({ error: "No request found" });
        if (!stored.is_verified) return res.status(403).json({ error: "OTP not verified" });

        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            executeQuery('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: "Database update failed" });

                delete global.otpStore[email];
                res.json({ message: "Password updated successfully" });
            });
        } catch (e) {
            res.status(500).json({ error: "Processing error" });
        }
    }
});



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
    if (!useJson && typeof db !== 'undefined' && db) {
        db.query("DELETE FROM otp_verification WHERE expiry < ?", [now], (err) => {
            if (err) console.error("Cron OTP DB cleanup error:", err);
            else console.log("Removed expired OTPs from database");
        });
    } else if (global.otpStore) {
        let cleared = 0;
        for (const email in global.otpStore) {
            if (global.otpStore[email].expiry < now) {
                delete global.otpStore[email];
                cleared++;
            }
        }
        if (cleared > 0) console.log(`Removed ${cleared} expired OTPs from JSON store`);
    }
});

function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
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
