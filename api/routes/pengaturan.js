// File: /routes/pengaturan.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const { isAdmin } = require('../middleware/auth');

// =================================================================
// API 1: Mengambil semua data pengaturan
// METHOD: GET, URL: /api/pengaturan
// =================================================================
router.get('/', isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM pengaturan;");

        // Ubah array hasil query menjadi sebuah objek tunggal agar mudah digunakan di frontend
        const settingsObject = rows.reduce((obj, item) => {
            obj[item.setting_key] = item.setting_value;
            return obj;
        }, {});
        
        res.status(200).json(settingsObject);
    } catch (error) {
        console.error("Error saat mengambil data pengaturan:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// =================================================================
// API 2: Memperbarui data pengaturan
// METHOD: PUT, URL: /api/pengaturan
// =================================================================
router.put('/', isAdmin, async (req, res) => {
    const settings = req.body; // Menerima objek berisi semua pengaturan baru

    try {
        const connection = await db.getConnection();
        await connection.beginTransaction(); // Mulai transaksi

        // Loop melalui setiap pengaturan yang dikirim dan update satu per satu
        for (const key in settings) {
            if (Object.hasOwnProperty.call(settings, key)) {
                const value = settings[key];
                await connection.query(
                    "UPDATE pengaturan SET setting_value = $1 WHERE setting_key = $2;",
                    [value, key]
                );
            }
        }

        await connection.commit(); // Konfirmasi semua perubahan jika berhasil
        connection.release(); // Lepaskan koneksi

        res.status(200).json({ message: "Pengaturan berhasil diperbarui." });

    } catch (error) {
        console.error("Error saat memperbarui pengaturan:", error);
        // Jika terjadi error, batalkan semua perubahan
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;