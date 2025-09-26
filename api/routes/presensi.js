// File: /routes/presensi.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const { isGuru } = require('../middleware/auth');

// =================================================================
// KONFIGURASI PRESENSI (Ambil dari database pengaturan)
// =================================================================
let PENGATURAN = {};
async function loadPengaturan() {
    try {
        const [rows] = await db.query("SELECT * FROM pengaturan;");
        PENGATURAN = rows.reduce((obj, item) => {
            obj[item.setting_key] = item.setting_value;
            return obj;
        }, {});
        console.log("Pengaturan presensi berhasil dimuat.");
    } catch (error) {
        console.error("Gagal memuat pengaturan, menggunakan nilai default:", error);
        // Fallback jika database pengaturan gagal dimuat
        PENGATURAN = {
            school_lat: -3.7885,
            school_lon: 102.2600,
            radius_meter: 100,
            batas_jam_masuk: "07:30:00"
        };
    }
}
loadPengaturan(); // Muat pengaturan saat server pertama kali berjalan

// Fungsi bantuan untuk menghitung jarak
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// =================================================================
// ENDPOINT: Presensi Masuk
// METHOD: POST, URL: /api/presensi/masuk
// =================================================================
router.post('/masuk', isGuru, async (req, res) => {
    const id_guru = req.user.id_guru;
    const { latitude, longitude, foto_masuk } = req.body;
    const tanggal_hari_ini = new Date().toISOString().slice(0, 10);
    const jam_sekarang = new Date().toLocaleTimeString('en-GB');

    try {
        const [existing] = await db.query("SELECT * FROM presensi WHERE id_guru = $1 AND tanggal = $2;", [id_guru, tanggal_hari_ini]);
        if (existing.length > 0) {
            return res.status(409).json({ message: "Anda sudah melakukan presensi masuk hari ini." });
        }

        const jarak = calculateDistance(latitude, longitude, PENGATURAN.school_lat, PENGATURAN.school_lon);
        if (jarak > PENGATURAN.radius_meter) {
            return res.status(403).json({ message: `Lokasi Anda terlalu jauh dari sekolah (${Math.round(jarak)} meter).` });
        }

        const status = jam_sekarang > PENGATURAN.batas_jam_masuk ? 'Terlambat' : 'Tepat Waktu';
        
        const query = "INSERT INTO presensi (id_guru, tanggal, jam_masuk, foto_masuk, status) VALUES ($1, $2, $3, $4, );";
        await db.query(query, [id_guru, tanggal_hari_ini, jam_sekarang, foto_masuk, status]);

        res.status(201).json({ message: `Presensi masuk berhasil pada jam ${jam_sekarang}. Status: ${status}.` });

    } catch (error) {
        console.error("Error saat presensi masuk:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// =================================================================
// ENDPOINT: Presensi Pulang
// METHOD: POST, URL: /api/presensi/pulang
// =================================================================
router.post('/pulang', isGuru, async (req, res) => {
    const id_guru = req.user.id_guru;
    const { latitude, longitude, foto_pulang } = req.body;
    const tanggal_hari_ini = new Date().toISOString().slice(0, 10);
    const jam_sekarang = new Date().toLocaleTimeString('en-GB');

    try {
        const [presensiMasuk] = await db.query("SELECT * FROM presensi WHERE id_guru = $1 AND tanggal = $2;", [id_guru, tanggal_hari_ini]);
        if (presensiMasuk.length === 0) {
            return res.status(404).json({ message: "Anda belum melakukan presensi masuk hari ini." });
        }
        if (presensiMasuk[0].jam_pulang) {
            return res.status(409).json({ message: "Anda sudah melakukan presensi pulang hari ini." });
        }

        const jarak = calculateDistance(latitude, longitude, PENGATURAN.school_lat, PENGATURAN.school_lon);
        if (jarak > PENGATURAN.radius_meter) {
            return res.status(403).json({ message: `Lokasi Anda terlalu jauh dari sekolah (${Math.round(jarak)} meter).` });
        }

        const query = "UPDATE presensi SET jam_pulang = $1, foto_pulang = $2 WHERE id_presensi = $3;";
        await db.query(query, [jam_sekarang, foto_pulang, presensiMasuk[0].id_presensi]);

        res.status(200).json({ message: `Presensi pulang berhasil pada jam ${jam_sekarang}.` });
    } catch (error) {
        console.error("Error saat presensi pulang:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// =================================================================
// ENDPOINT: Guru melihat riwayat presensinya sendiri
// METHOD: GET, URL: /api/presensi/riwayat?bulan=9&tahun=2025
// =================================================================
router.get('/riwayat', isGuru, async (req, res) => {
    const id_guru = req.user.id_guru;
    const { bulan, tahun } = req.query;

    if (!bulan || !tahun) {
        return res.status(400).json({ message: "Parameter bulan dan tahun wajib diisi." });
    }

    try {
        const query = `
            SELECT tanggal, jam_masuk, jam_pulang, status 
            FROM presensi 
            WHERE id_guru = $1 AND MONTH(tanggal) = $2 AND YEAR(tanggal) = $3
            ORDER BY tanggal ASC;
        `;
        const [rows] = await db.query(query, [id_guru, bulan, tahun]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error saat mengambil riwayat presensi:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});
module.exports = router;