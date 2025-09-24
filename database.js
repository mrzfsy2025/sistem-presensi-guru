// File: /ABSENSI/database.js

const mysql = require('mysql2/promise');

// Konfigurasi koneksi ke database Anda
// Sesuaikan dengan pengaturan XAMPP Anda
const pool = mysql.createPool({
    host: 'localhost',      // Biasanya selalu 'localhost'
    user: 'root',           // User default XAMPP adalah 'root'
    password: 't/068fA@6fqoFG53',            // Password default XAMPP adalah kosong
    database: 'absensi_db', // NAMA DATABASE ANDA DI PHPMYADMIN
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Pesan konfirmasi jika koneksi berhasil
pool.getConnection()
    .then(connection => {
        console.log('Berhasil terhubung ke database MySQL!');
        connection.release(); // Lepaskan koneksi setelah selesai
    })
    .catch(err => {
        console.error('Gagal terhubung ke database:', err.stack);
    });


// Export 'pool' agar bisa digunakan oleh file lain (seperti adminGuru.js)
module.exports = pool;