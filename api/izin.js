// File: /routes/izin.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const { isGuru } = require('../middleware/auth'); // Menggunakan middleware yang sama

// =================================================================
// API 1: Guru membuat pengajuan izin baru
// METHOD: POST, URL: /api/izin
// =================================================================
router.post('/', isGuru, async (req, res) => {
    const id_guru = req.user.id_guru;
    const { tanggal_mulai, tanggal_selesai, jenis_izin, keterangan } = req.body;

    if (!tanggal_mulai || !tanggal_selesai || !jenis_izin || !keterangan) {
        return res.status(400).json({ message: "Semua kolom wajib diisi." });
    }

    try {
        const query = `
            INSERT INTO izin_sakit_tugas 
            (id_guru, tanggal_mulai, tanggal_selesai, jenis_izin, keterangan, status) 
            VALUES (?, ?, ?, ?, ?, ?);
        `;
        await db.query(query, [id_guru, tanggal_mulai, tanggal_selesai, jenis_izin, keterangan, 'Menunggu Persetujuan']);

        res.status(201).json({ message: "Pengajuan izin berhasil dikirim." });
    } catch (error) {
        console.error("Error saat membuat pengajuan izin:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// =================================================================
// API 2: Guru melihat riwayat pengajuannya sendiri
// METHOD: GET, URL: /api/izin/riwayat
// =================================================================
router.get('/riwayat', isGuru, async (req, res) => {
    const id_guru = req.user.id_guru;
    try {
        const query = "SELECT * FROM izin_sakit_tugas WHERE id_guru = ? ORDER BY tanggal_mulai DESC;";
        const [rows] = await db.query(query, [id_guru]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error saat mengambil riwayat izin:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;