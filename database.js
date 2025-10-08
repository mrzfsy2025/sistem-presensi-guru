// File: /api/database.js 

const mysql = require('mysql2/promise');
<<<<<<< HEAD
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
pool.getConnection()
    .then(connection => {
        console.log('Berhasil terhubung ke database MySQL!');
        connection.release(); // Lepaskan koneksi setelah selesai
    })
    .catch(err => {
        console.error('Gagal terhubung ke database:', err.stack);
    });
module.exports = pool;
=======
const pool = mysql.createPool(process.env.DATABASE_URL);
module.exports = pool;
>>>>>>> abbccc75cb5722867a0d96a12fd7fb0fd35fc4ef
