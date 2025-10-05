// File: /routes/guru.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
const db = require('../database');
const { checkAuth } = require('../middleware/auth'); 
const bcrypt = require('bcryptjs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Pastikan folder ini ada di proyek Anda
        cb(null, 'public/uploads/'); 
    },
    filename: function (req, file, cb) {
        // Buat nama file yang unik untuk menghindari duplikasi
        cb(null, 'guru-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// =================================================================
// ENDPOINT: Mengambil profil & status presensi guru yang sedang login
// METHOD: GET, URL: /api/guru/status
// =================================================================
router.get('/status', checkAuth, async (req, res) => {
    // ID guru didapat dari token yang sudah diverifikasi oleh middleware
    const id_guru = req.user.id_guru;
    const tanggal_hari_ini = new Date().toISOString().slice(0, 10);

    try {
        // Query 1: Ambil data profil guru
        const [profilRows] = await db.query(
            "SELECT nama_lengkap, nip_nipppk, email FROM guru WHERE id_guru = ?;", // Tambahkan email
            [id_guru]
        );
        if (profilRows.length === 0) {
            return res.status(404).json({ message: 'Profil guru tidak ditemukan.' });
        }

        // Query 2: Ambil data presensi hari ini
        const [presensiRows] = await db.query(
            "SELECT jam_masuk, jam_pulang FROM presensi WHERE id_guru = ? AND tanggal = ?;",
            [id_guru, tanggal_hari_ini]
        );

        // Tentukan status presensi berdasarkan hasil query
        let status_presensi = {
            kondisi: 'BELUM_MASUK',
            jam_masuk: null,
            jam_pulang: null
        };

        if (presensiRows.length > 0) {
            const presensiHariIni = presensiRows[0];
            if (presensiHariIni.jam_pulang) {
                status_presensi.kondisi = 'SUDAH_PULANG';
                status_presensi.jam_pulang = presensiHariIni.jam_pulang;
            } else {
                status_presensi.kondisi = 'SUDAH_MASUK';
            }
            status_presensi.jam_masuk = presensiHariIni.jam_masuk;
        }
        
        // Gabungkan semua data menjadi satu objek balasan
        const responseData = {
            profil: profilRows[0],
            status_presensi: status_presensi
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error saat mengambil status guru:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// =================================================================
// ENDPOINT: Guru mengubah password-nya sendiri
// METHOD: PUT, URL: /api/guru/profile/password
// =================================================================
router.put('/profile/password', checkAuth, async (req, res) => {
    // Ambil ID guru dari token yang sudah terverifikasi
    const id_guru = req.user.id_guru;
    const { password_lama, password_baru, konfirmasi_password_baru } = req.body;

    // 1. Validasi input dari form
    if (!password_lama || !password_baru || !konfirmasi_password_baru) {
        return res.status(400).json({ message: "Semua kolom password wajib diisi." });
    }
    if (password_baru !== konfirmasi_password_baru) {
        return res.status(400).json({ message: "Password baru dan konfirmasi tidak cocok." });
    }
    if (password_baru.length < 6) {
        return res.status(400).json({ message: "Password baru minimal harus 6 karakter." });
    }

    try {
        // 2. Ambil hash password saat ini dari database untuk guru yang sedang login
        const [rows] = await db.query("SELECT password_hash FROM guru WHERE id_guru = ?;", [id_guru]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }
        const guru = rows[0];

        // 3. Verifikasi apakah password lama yang dimasukkan benar
        const isPasswordMatch = await bcrypt.compare(password_lama, guru.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Password lama yang Anda masukkan salah." });
        }

        // 4. Jika benar, hash password baru dan update ke database
        const salt = await bcrypt.genSalt(10);
        const password_hash_baru = await bcrypt.hash(password_baru, salt);

        await db.query("UPDATE guru SET password_hash = ? WHERE id_guru = ?;", [password_hash_baru, id_guru]);

        res.status(200).json({ message: "Password berhasil diperbarui." });

    } catch (error) {
        console.error("Error saat mengubah password:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});
module.exports = router;