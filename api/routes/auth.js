// File: /ABSENSI/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database'); // Memanggil file database.js
const router = express.Router();

// Kunci rahasia JWT. Ini HARUS SAMA PERSIS dengan kunci
// yang ada di dalam file middleware/auth.js
const JWT_SECRET = '1793-9Y$-.440';

// =============================================================
// ENDPOINT: LOGIN ADMIN/GURU
// METHOD: POST, URL: /api/auth/login
// =============================================================
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan password wajib diisi.' });
    }

    try {
        const query = "SELECT * FROM guru WHERE email = $1 AND status = 'Aktif';";
        // Gunakan $1, $2, dst. untuk parameter di PostgreSQL
        const result = await db.query(query, [email]);
        
        // Ambil data dari result.rows, bukan langsung [rows]
        const rows = result.rows;

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }
        const guru = rows[0];

        const isPasswordMatch = await bcrypt.compare(password, guru.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        const payload = { id_guru: guru.id_guru, nama: guru.nama_lengkap, email: guru.email, role: guru.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        
        res.status(200).json({
            message: 'Login berhasil!',
            token: token
        });

    } catch (error) {
        console.error("Error saat proses login:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});
module.exports = router;