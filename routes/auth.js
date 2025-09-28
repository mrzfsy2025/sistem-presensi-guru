// File: /ABSENSI/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database'); 
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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
        // 1. Cari guru di database berdasarkan email
        const query = "SELECT * FROM guru WHERE email = ? AND status = 'Aktif';";
        const [rows] = await db.query(query, [email]);

        // Jika email tidak ditemukan
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }
        const guru = rows[0];

        // 2. Bandingkan password yang diinput dengan yang ada di database
        const isPasswordMatch = await bcrypt.compare(password, guru.password_hash);

        // Jika password tidak cocok
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        // 3. Jika cocok, buatkan JWT Token
        const payload = {
        id_guru: guru.id_guru,
        nama: guru.nama_lengkap,
        email: guru.email,
        role: guru.role 
        };

        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: '8h' // Token berlaku selama 8 jam
        });
        
        // 4. Kirim token ke frontend
        res.status(200).json({
            message: 'Login berhasil!',
            token: token
        });

    } catch (error) {
        console.error("Error saat proses login:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});
// =============================================================
// ENDPOINT: MEMINTA RESET PASSWORD
// METHOD: POST, URL: /api/auth/forgot-password
// =============================================================
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Cari guru berdasarkan email
        const [rows] = await db.query("SELECT * FROM guru WHERE email = ?;", [email]);
        if (rows.length === 0) {
            // Kita kirim pesan sukses palsu agar peretas tidak tahu email mana yang terdaftar
            return res.status(200).json({ message: "Jika email Anda terdaftar, Anda akan menerima link reset password." });
        }
        const guru = rows[0];

        // 2. Buat token reset yang unik dan acak
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // 3. Tentukan waktu kadaluarsa token (misalnya, 1 jam dari sekarang)
        const expireDate = new Date();
        expireDate.setHours(expireDate.getHours() + 1);

        // 4. Simpan token dan waktu kadaluarsanya ke database
        await db.query(
            "UPDATE guru SET password_reset_token = ?, password_reset_expires = ? WHERE id_guru = ?;",
            [resetToken, expireDate, guru.id_guru]
        );

        // 5. Konfigurasi "kurir" email (Nodemailer)
        // PENTING: Gunakan detail email Anda sendiri atau layanan email khusus.
        // Contoh ini menggunakan GMail, mungkin perlu penyesuaian keamanan di akun Google Anda.
        // Membaca dari .env
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS,  
            }
        });        

        // 6. Buat link reset dan isi email
        const resetUrl = `http://localhost:8080/reset-password.html?token=${resetToken}`;
        const mailOptions = {
            to: guru.email,
            from: `Admin Absensi <${process.env.EMAIL_USER}>`, // <-- Perbarui ini
            subject: 'Reset Password Akun Absensi Anda',
            text: `Anda menerima email ini karena Anda (atau orang lain) meminta untuk mereset password akun Anda.\n\n` +
                  `Silakan klik link di bawah ini, atau salin-tempel ke browser Anda untuk melanjutkan:\n\n` +
                  `${resetUrl}\n\n` +
                  `Jika Anda tidak meminta ini, silakan abaikan email ini dan password Anda akan tetap aman.\n`
        };
        // 7. Kirim email
        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ message: "Email reset password telah berhasil dikirim." });

    } catch (error) {
        console.error("Error saat forgot-password:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});
// =============================================================
// ENDPOINT: MEMPROSES RESET PASSWORD BARU
// METHOD: POST, URL: /api/auth/reset-password
// =============================================================
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: "Token dan password baru wajib diisi." });
    }

    try {
        // 1. Cari guru berdasarkan token reset DAN pastikan tokennya belum kadaluarsa
        const query = "SELECT * FROM guru WHERE password_reset_token = ? AND password_reset_expires > NOW();";
        const [rows] = await db.query(query, [token]);

        if (rows.length === 0) {
            return res.status(400).json({ message: "Token reset password tidak valid atau sudah kadaluarsa." });
        }
        const guru = rows[0];

        // 2. Hash password baru
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 3. Update password di database dan hapus token reset agar tidak bisa dipakai lagi
        await db.query(
            "UPDATE guru SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id_guru = ?;",
            [password_hash, guru.id_guru]
        );

        res.status(200).json({ message: "Password berhasil direset. Silakan login dengan password baru Anda." });

    } catch (error) {
        console.error("Error saat reset-password:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});
module.exports = router;