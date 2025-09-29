// File: /api/database.js 

const mysql = require('mysql2/promise');
const pool = mysql.createPool(process.env.DATABASE_URL);
pool.getConnection()
    .then(connection => {
        console.log('Berhasil terhubung ke database MySQL!');
        connection.release(); // Lepaskan koneksi setelah selesai
    })
    .catch(err => {
        console.error('Gagal terhubung ke database:', err.stack);
    });
module.exports = pool;
