// File: /api/database.js 

const mysql = require('mysql2/promise');
const pool = mysql.createPool(process.env.DATABASE_URL);
// const pool = mysql.createPool({
// host: 'localhost',     
// user: 'root',          
// password: 't/068fA@6fqoFG53',
// database: 'absensi_db', 
// waitForConnections: true,
// connectionLimit: 10,
// queueLimit: 0
// });
// pool.getConnection()
//     .then(connection => {
//     console.log('Berhasil terhubung ke database MySQL!');
//     connection.release(); // Lepaskan koneksi setelah selesai
//     })
//     .catch(err => {
//         console.error('Gagal terhubung ke database:', err.stack);
//    });
module.exports = pool;
