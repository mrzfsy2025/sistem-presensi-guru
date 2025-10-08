// =================================================================
// routes/presensi.js (VERSI PERBAIKAN)
// =================================================================

const express = require('express');
const router = express.Router();
const db = require('../database');
const { checkAuth } = require('../middleware/auth');

// 1. Membuat Middleware untuk pengaturan
// Middleware ini akan berjalan setiap kali ada request ke endpoint presensi.
const loadPengaturanMiddleware = async (req, res, next) => {
    try {
        const [rows] = await db.query("SELECT * FROM pengaturan;");
        // Konversi hasil query array menjadi objek, sekaligus mengubah tipe data
        const settings = rows.reduce((obj, item) => {
            let value = item.setting_value;
            // Konversi nilai yang seharusnya angka menjadi tipe data number
            if (item.setting_key === 'school_lat' || item.setting_key === 'school_lon') {
                value = parseFloat(value);
            } else if (item.setting_key === 'radius_meter') {
                value = parseInt(value, 10);
            }
            obj[item.setting_key] = value;
            return obj;
        }, {});
        
        // Simpan pengaturan ke dalam objek request agar bisa diakses di endpoint
        req.pengaturan = settings; 
        next(); // Lanjutkan ke proses selanjutnya (endpoint)
    } catch (error) {
        console.error("Gagal memuat pengaturan:", error);
        // Jika gagal, kirim response error dan jangan lanjutkan
        res.status(500).json({ message: "Server tidak dapat memuat konfigurasi pengaturan." });
    }
};

// router.use() akan menerapkan middleware ini ke semua rute di file ini.
router.use(loadPengaturanMiddleware);

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radius bumi dalam meter
    const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180, Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// --- ENDPOINT PRESENSI MASUK ---
router.post('/masuk', checkAuth, async (req, res) => {
    // Ambil pengaturan dari objek request yang sudah disiapkan middleware
    const { school_lat, school_lon, radius_meter, batas_jam_masuk } = req.pengaturan;
    
    const id_guru = req.user.id_guru;
    const { latitude, longitude, foto_masuk } = req.body;
    
    try {
        const tanggal_hari_ini = new Date().toISOString().slice(0, 10);
        const [existing] = await db.query("SELECT * FROM presensi WHERE id_guru = ? AND tanggal = ?;", [id_guru, tanggal_hari_ini]);
        if (existing.length > 0) return res.status(409).json({ message: "Anda sudah melakukan presensi masuk hari ini." });
        
        if (typeof latitude === 'undefined' || typeof longitude === 'undefined' || typeof school_lat === 'undefined' || typeof school_lon === 'undefined') {
            return res.status(400).json({ message: "Data lokasi tidak lengkap untuk perhitungan jarak." });
        }

        const jarak = calculateDistance(latitude, longitude, school_lat, school_lon);
        
        if (jarak > radius_meter) {
            return res.status(403).json({ message: `Lokasi Anda terlalu jauh dari sekolah (${Math.round(jarak)} meter). Radius yang diizinkan: ${radius_meter} meter.` });
        }

        // ===================================================================
        // LOGIKA PENENTUAN STATUS TEPAT WAKTU / TERLAMBAT (DIPERBAIKI)
        // ===================================================================
        const waktuSekarang = new Date(); // Objek Date lengkap untuk waktu saat ini
        const jam_sekarang_string = waktuSekarang.toLocaleTimeString('en-GB'); // String untuk disimpan ke DB
    console.log("Nilai 'batas_jam_masuk' yang diterima:", batas_jam_masuk);

        // Siapkan objek Date untuk batas waktu masuk pada hari ini
        const hariIni = waktuSekarang.toISOString().slice(0, 10);
        const waktuBatasMasuk = new Date(`${hariIni}T${batas_jam_masuk}`);
    console.log("Objek Waktu Sekarang:", waktuSekarang);
    console.log("Objek Waktu Batas Masuk:", waktuBatasMasuk);    

        // Lakukan perbandingan menggunakan objek Date yang akurat
        const status = waktuSekarang < waktuBatasMasuk ? 'Tepat Waktu' : 'Terlambat';
        // ===================================================================
    console.log("Hasil Status:", status); // Cek hasil akhir status

        // Simpan jam dalam format string, namun status sudah benar
        await db.query("INSERT INTO presensi (id_guru, tanggal, jam_masuk, foto_masuk, status) VALUES (?, ?, ?, ?, ?);", [id_guru, tanggal_hari_ini, jam_sekarang_string, foto_masuk, status]);
        
        res.status(201).json({ message: `Presensi masuk berhasil pada jam ${jam_sekarang_string}. Status: ${status}.` });

    } catch (error) {
        console.error("Error saat presensi masuk:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// --- ENDPOINT PRESENSI PULANG ---
router.post('/pulang', checkAuth, async (req, res) => {
    const id_guru = req.user.id_guru;
    const { foto_pulang } = req.body; // latitude dan longitude tidak digunakan di sini
    const tanggal_hari_ini = new Date().toISOString().slice(0, 10);
    const jam_sekarang = new Date().toLocaleTimeString('en-GB');
    try {
        const [presensiMasuk] = await db.query("SELECT * FROM presensi WHERE id_guru = ? AND tanggal = ?;", [id_guru, tanggal_hari_ini]);
        if (presensiMasuk.length === 0) return res.status(404).json({ message: "Anda belum melakukan presensi masuk hari ini." });
        if (presensiMasuk[0].jam_pulang) return res.status(409).json({ message: "Anda sudah melakukan presensi pulang hari ini." });

        await db.query("UPDATE presensi SET jam_pulang = ?, foto_pulang = ? WHERE id_presensi = ?;", [jam_sekarang, foto_pulang, presensiMasuk[0].id_presensi]);
        res.status(200).json({ message: `Presensi pulang berhasil pada jam ${jam_sekarang}.` });
    } catch (error) {
        console.error("Error saat presensi pulang:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// --- ENDPOINT RIWAYAT PRESENSI ---
router.get('/riwayat', checkAuth, async (req, res) => {
    // Endpoint ini tidak memerlukan data pengaturan, jadi tidak ada perubahan
    const id_guru = req.user.id_guru;
    const { bulan, tahun } = req.query;
    if (!bulan || !tahun) return res.status(400).json({ message: "Parameter bulan dan tahun wajib diisi." });

    try {
        const query = `
            SELECT tanggal, jam_masuk, jam_pulang, status 
            FROM presensi 
            WHERE id_guru = ? AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?
            ORDER BY tanggal ASC;
        `;
        const [rows] = await db.query(query, [id_guru, bulan, tahun]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error saat mengambil riwayat presensi:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

function formatWaktuLokal(waktuUTC) {
    if (!waktuUTC) return '-';
    const tanggal = new Date(`1970-01-01T${waktuUTC}Z`);
    // Waktu zona waktu Asia/Jakarta (GMT+7) format 24 jam
    return tanggal.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
    });
    };

module.exports = router;