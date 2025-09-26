// File: /api/index.js (File Backend Tunggal untuk Vercel)

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database'); // Pastikan path ini benar

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// =============================================================
// SEMUA LOGIKA API DITEMPATKAN DI SINI
// =============================================================

// --- Logika dari auth.js ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi.' });
    try {
        const result = await db.query("SELECT * FROM guru WHERE email = $1 AND status = 'Aktif';", [email]);
        const rows = result.rows;
        if (rows.length === 0) return res.status(401).json({ message: 'Email atau password salah.' });
        const guru = rows[0];
        const isPasswordMatch = await bcrypt.compare(password, guru.password_hash);
        if (!isPasswordMatch) return res.status(401).json({ message: 'Email atau password salah.' });
        const payload = { id_guru: guru.id_guru, nama: guru.nama_lengkap, email: guru.email, role: guru.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ message: 'Login berhasil!', token: token });
    } catch (error) {
        console.error("Error saat login:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// --- Logika dari guru.js, dashboard.js, dll. bisa ditambahkan di sini dengan pola yang sama ---
// Contoh:
// app.get('/api/guru/status', (req, res) => { ... });
// app.get('/api/dashboard/summary', (req, res) => { ... });
// Dst.

// =============================================================
// Export aplikasi untuk Vercel
// =============================================================
module.exports = app;