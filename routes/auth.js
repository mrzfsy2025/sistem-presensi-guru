// File: /ABSENSI/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database'); 
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'kunci-rahasia-default';

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
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM guru WHERE email = ?;", [email]);
        if (rows.length === 0) {
            return res.status(200).json({ message: "Jika email Anda terdaftar, Anda akan menerima link reset password." });
        }
        const guru = rows[0];

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expireDate = new Date();
        expireDate.setHours(expireDate.getHours() + 1); // Token berlaku 1 jam

        await db.query(
            "UPDATE guru SET password_reset_token = ?, password_reset_expires = ? WHERE id_guru = ?;",
            [resetToken, expireDate, guru.id_guru]
        );

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetUrl = `https://sistem-presensi-guru-production-3b6d.up.railway.app/reset-password.html?token=${resetToken}`;
        
        await transporter.sendMail({
            to: guru.email,
            from: `Admin Absensi <${process.env.EMAIL_USER}>`,
            subject: 'Reset Password Akun Absensi',
            text: `Anda menerima email ini karena ada permintaan untuk mereset password.\n\nKlik link ini untuk melanjutkan:\n${resetUrl}\n\nJika Anda tidak meminta ini, abaikan email ini.`
        });
        
        res.status(200).json({ message: "Email reset password telah berhasil dikirim." });
    } catch (error) {
        console.error("Error saat forgot-password:", error);
        res.status(500).json({ message: "Terjadi error pada server saat mengirim email. Hubungi Admin !" });
    }
});

router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ message: "Token dan password baru wajib diisi." });
    }

    try {
        const [rows] = await db.query(
            "SELECT * FROM guru WHERE password_reset_token = ? AND password_reset_expires > NOW();",
            [token]
        );
        if (rows.length === 0) {
            return res.status(400).json({ message: "Token reset password tidak valid atau sudah kadaluarsa." });
        }
        const guru = rows[0];

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

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