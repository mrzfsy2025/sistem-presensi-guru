// File: /routes/adminPresensi.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const { isAdmin } = require('../middleware/auth');

// =================================================================
// API 1: Mengambil semua data presensi pada tanggal tertentu
// METHOD: GET, URL: /api/admin/presensi?tanggal=2025-09-23
// =================================================================
router.get('/', isAdmin, async (req, res) => {
    const { tanggal } = req.query;

    if (!tanggal) {
        return res.status(400).json({ message: 'Parameter tanggal wajib diisi.' });
    }

    try {
        const query = `
            SELECT p.id_presensi, p.tanggal, p.jam_masuk, p.jam_pulang, p.status, g.nama_lengkap
            FROM presensi AS p
            JOIN guru AS g ON p.id_guru = g.id_guru
            WHERE p.tanggal = ?
            ORDER BY g.nama_lengkap ASC;
        `;
        const [rows] = await db.query(query, [tanggal]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error saat mengambil data presensi:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// =================================================================
// API 2: Memperbarui satu data presensi (untuk koreksi)
// METHOD: PUT, URL: /api/admin/presensi/:id_presensi
// =================================================================
router.put('/:id_presensi', isAdmin, async (req, res) => {
    const { id_presensi } = req.params;
    const { jam_masuk, jam_pulang, status } = req.body;

    if (!jam_masuk || !status) {
        return res.status(400).json({ message: 'Jam masuk dan status wajib diisi.' });
    }

    try {
        const query = `
            UPDATE presensi 
            SET jam_masuk = ?, jam_pulang = ?, status = ? 
            WHERE id_presensi = ?;
        `;
        // jam_pulang bisa null jika dikosongkan
        const jamPulangValue = jam_pulang ? jam_pulang : null;

        const [result] = await db.query(query, [jam_masuk, jamPulangValue, status, id_presensi]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Data presensi tidak ditemukan." });
        }

        res.status(200).json({ message: "Data presensi berhasil diperbarui." });
    } catch (error) {
        console.error("Error saat memperbarui presensi:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});


module.exports = router;