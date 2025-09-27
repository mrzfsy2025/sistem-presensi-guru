// File: /api/database.js (Versi MySQL)
const mysql = require('mysql2/promise');

const pool = mysql.createPool(process.env.DATABASE_URL);

module.exports = pool;