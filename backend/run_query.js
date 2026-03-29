require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : ''
});

connection.connect(err => {
    if (err) {
        console.error('MySQL connection failed:', err.message);
        process.exit(1);
    }
    connection.query(`USE \`${process.env.DB_NAME || 'glamorous_salon'}\``, (err) => {
        if (err) { console.error('USE DB failed:', err); process.exit(1); }
        
        const alterOTP = `ALTER TABLE otp_verification MODIFY otp VARCHAR(255) NOT NULL`;
                          
        connection.query(alterOTP, (err) => {
            if (err) { 
                console.error('Table modify failed:', err); process.exit(1); 
            } else {
                console.log('OTP Table updated successfully: otp column is now VARCHAR(255).');
            }
            process.exit(0);
        });
    });
});
