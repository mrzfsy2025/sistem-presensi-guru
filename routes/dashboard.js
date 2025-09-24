// File: /routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../database');
// Kita butuh middleware untuk memastikan hanya admin yang bisa akses
// const { isAdmin } = require('../middleware/auth');

// Endpoint untuk mendapatkan data ringkasan dasbor
const { isAdmin } = require('../middleware/auth'); // <-- Pastikan ini aktif
router.get('/summary', isAdmin, async (req, res) => { // <-- Hapus /* dan */
    try {
        const tanggal_hari_ini = new Date().toISOString().slice(0, 10);
console.log(`Mencari data untuk tanggal: ${tanggal_hari_ini}`); // Log Tanggal

        // 1. Menghitung ringkasan presensi (hadir, terlambat)
        const [presensiSummary] = await db.query(
            `SELECT
                COUNT(*) as total_hadir,
                SUM(CASE WHEN status = 'Terlambat' THEN 1 ELSE 0 END) as total_terlambat
             FROM presensi WHERE tanggal = ?;`,
            [tanggal_hari_ini]
        );
console.log("Hasil Query Presensi:", presensiSummary); // <-- TAMBAHKAN INI

        // 2. Menghitung ringkasan izin/sakit (VERSI PERBAIKAN)
        const [izinSummary] = await db.query(
            `SELECT COUNT(*) as total_izin_sakit FROM izin_sakit_tugas
            WHERE status = 'Disetujui' AND tanggal_mulai <= ? AND tanggal_selesai >= ?;`,
            [tanggal_hari_ini, tanggal_hari_ini]
        );
console.log("Hasil Query Izin/Sakit:", izinSummary); // <-- TAMBAHKAN INI

        // 3. Menghitung total guru aktif
        const [totalGuru] = await db.query("SELECT COUNT(*) as total_aktif FROM guru WHERE status = 'Aktif';");

        // 4. Mengambil 5 aktivitas presensi terkini
        const [aktivitasTerkini] = await db.query(
            `(SELECT g.nama_lengkap, p.jam_masuk AS waktu_aksi, 'Presensi Masuk' AS jenis_aktivitas, p.status
                FROM presensi p JOIN guru g ON p.id_guru = g.id_guru
                WHERE p.tanggal = ? AND p.jam_masuk IS NOT NULL)
            UNION ALL
            (SELECT g.nama_lengkap, p.jam_pulang AS waktu_aksi, 'Presensi Pulang' AS jenis_aktivitas, p.status
                FROM presensi p JOIN guru g ON p.id_guru = g.id_guru
                WHERE p.tanggal = ? AND p.jam_pulang IS NOT NULL)
            ORDER BY waktu_aksi DESC LIMIT 5;`,
            [tanggal_hari_ini, tanggal_hari_ini]
        );
console.log("Hasil Query Total Guru:", totalGuru); // <-- TAMBAHKAN INI

        // 5. Mengambil 5 permintaan izin yang menunggu persetujuan
        const [permintaanIzin] = await db.query(
            `SELECT g.nama_lengkap, i.tanggal_mulai, i.id_izin FROM izin_sakit_tugas i
             JOIN guru g ON i.id_guru = g.id_guru
             WHERE i.status = 'Menunggu Persetujuan' ORDER BY i.created_at DESC LIMIT 5;`
        );

        // Kalkulasi "Belum Ada Kabar"
        const hadir = presensiSummary[0].total_hadir || 0;
        const izin_sakit = izinSummary[0].total_izin_sakit || 0;
        const total_aktif = totalGuru[0].total_aktif || 0;
        const belum_ada_kabar = total_aktif - hadir - izin_sakit;

        // Gabungkan semua data menjadi satu objek JSON
        const responseData = {
            summary_cards: {
                hadir: hadir,
                terlambat: presensiSummary[0].total_terlambat || 0,
                izin_sakit: izin_sakit,
                belum_ada_kabar: belum_ada_kabar < 0 ? 0 : belum_ada_kabar
            },
            aktivitas_terkini: aktivitasTerkini,
            permintaan_persetujuan: permintaanIzin
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error saat mengambil data dasbor:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;