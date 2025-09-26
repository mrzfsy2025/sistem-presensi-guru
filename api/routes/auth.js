// File: /api/routes/auth.js (VERSI PERBAIKAN UNTUK POSTGRESQL)

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const router = express.Router();

// Pastikan kunci ini sama dengan yang ada di middleware/auth.js
const JWT_SECRET = process.env.JWT_SECRET || '1793-9Y$-.440';

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan password wajib diisi.' });
    }

    try {
        // 1. Gunakan $1 untuk parameter, bukan ?
        const query = "SELECT * FROM guru WHERE email = $1 AND status = 'Aktif';";
        
        // 2. Ambil hasil dengan cara PostgreSQL
        const result = await db.query(query, [email]);
        const rows = result.rows; // Data ada di dalam properti .rows

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }
        const guru = rows[0];

        const isPasswordMatch = await bcrypt.compare(password, guru.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        const payload = { id_guru: guru.id_guru, nama: guru.nama_lengkap, email: guru.email, role: guru.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
        
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