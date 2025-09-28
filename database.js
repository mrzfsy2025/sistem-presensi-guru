// File: /api/database.js (VERSI LANGSUNG)

const mysql = require('mysql2/promise');

// Konfigurasi koneksi langsung ke database XAMPP Anda
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 't/068fA@6fqoFG53', 
    database: 'absensi_db', 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;