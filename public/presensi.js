// =================================================================
// routes/presensi.js
// =================================================================

const express = require('express');
const router = express.Router();
const db = require('../database');
// Middleware ini akan memverifikasi token dan memastikan user adalah guru
const { isGuru } = require('../middleware/auth'); 

// =================================================================
// KONFIGURASI SEKOLAH (Contoh)
// =================================================================
const LOKASI_SEKOLAH = {
  latitude: -3.7885, // Ganti dengan latitude sekolah Anda
  longitude: 102.2600 // Ganti dengan longitude sekolah Anda
};
const RADIUS_TOLERANSI_METER = 100; // Toleransi jarak presensi (dalam meter)
const BATAS_JAM_MASUK = "07:30:00"; // Batas waktu untuk dianggap tepat waktu

// =================================================================
// FUNGSI BANTUAN: Menghitung jarak antara dua titik koordinat (Haversine formula)
// =================================================================
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radius bumi dalam meter
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Jarak dalam meter
};


// =================================================================
// ENDPOINT 1: Presensi Masuk (Clock-in)
// METHOD: POST, ENDPOINT: /api/presensi/masuk
// =================================================================
router.post('/masuk', isGuru, async (req, res) => {
  // Ambil id_guru dari token yang sudah diverifikasi oleh middleware 'isGuru'
  const id_guru = req.user.id_guru; 
  const { latitude, longitude, foto_masuk } = req.body;
  const tanggal_hari_ini = new Date().toISOString().slice(0, 10); // Format YYYY-MM-DD
  const jam_sekarang = new Date().toLocaleTimeString('en-GB'); // Format HH:MM:SS

  try {
    // 1. Cek apakah guru sudah presensi masuk hari ini
    const [existingPresensi] = await db.query("SELECT * FROM presensi WHERE id_guru = ? AND tanggal = ?;", [id_guru, tanggal_hari_ini]);
    if (existingPresensi.length > 0) {
      return res.status(409).json({ message: "Anda sudah melakukan presensi masuk hari ini." });
    }

    // 2. Validasi lokasi
    const jarak = calculateDistance(latitude, longitude, LOKASI_SEKOLAH.latitude, LOKASI_SEKOLAH.longitude);
    if (jarak > RADIUS_TOLERANSI_METER) {
      return res.status(403).json({ message: `Lokasi Anda terlalu jauh dari sekolah (${Math.round(jarak)} meter).` });
    }

    // 3. Tentukan status (Tepat Waktu atau Terlambat)
    const status = jam_sekarang > BATAS_JAM_MASUK ? 'Terlambat' : 'Tepat Waktu';

    // 4. Simpan data presensi masuk ke database
    const query = "INSERT INTO presensi (id_guru, tanggal, jam_masuk, status, foto_masuk) VALUES (?, ?, ?, ?, ?);";
    await db.query(query, [id_guru, tanggal_hari_ini, jam_sekarang, status, foto_masuk]);

    res.status(201).json({ message: `Presensi masuk berhasil pada jam ${jam_sekarang}. Status: ${status}.` });

  } catch (error) {
    console.error("Error saat presensi masuk:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});


// =================================================================
// ENDPOINT 2: Presensi Pulang (Clock-out)
// METHOD: POST, ENDPOINT: /api/presensi/pulang
// =================================================================
router.post('/pulang', isGuru, async (req, res) => {
  const id_guru = req.user.id_guru;
  const { latitude, longitude, foto_pulang } = req.body;
  const tanggal_hari_ini = new Date().toISOString().slice(0, 10);
  const jam_sekarang = new Date().toLocaleTimeString('en-GB');

  try {
    // 1. Cari data presensi masuk hari ini
    const [presensiMasuk] = await db.query("SELECT * FROM presensi WHERE id_guru = ? AND tanggal = ?;", [id_guru, tanggal_hari_ini]);
    if (presensiMasuk.length === 0) {
      return res.status(404).json({ message: "Anda belum melakukan presensi masuk hari ini." });
    }
    if (presensiMasuk[0].jam_pulang) {
      return res.status(409).json({ message: "Anda sudah melakukan presensi pulang hari ini." });
    }

    // 2. Validasi lokasi
    const jarak = calculateDistance(latitude, longitude, LOKASI_SEKOLAH.latitude, LOKASI_SEKOLAH.longitude);
    if (jarak > RADIUS_TOLERANSI_METER) {
      return res.status(403).json({ message: `Lokasi Anda terlalu jauh dari sekolah (${Math.round(jarak)} meter).` });
    }

    // 3. Update data presensi dengan jam pulang
    const query = "UPDATE presensi SET jam_pulang = ?, foto_pulang = ? WHERE id_presensi = ?;";
    await db.query(query, [jam_sekarang, foto_pulang, presensiMasuk[0].id_presensi]);

    res.status(200).json({ message: `Presensi pulang berhasil pada jam ${jam_sekarang}.` });

  } catch (error) {
    console.error("Error saat presensi pulang:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});


module.exports = router;