// File: laporan.js (SUDAH DIPERBAIKI)

const express = require('express');
const router = express.Router();
const db = require('../database.js'); 
const { checkAuth, checkAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const getWorkingDaysInMonth = (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        if (currentDate.getDay() !== 0) { // Asumsi hari Minggu libur (getDay() === 0)
            workingDays++;
        }
    }
    return workingDays;
};

// =================================================================
// ENDPOINT DETAIL HARIAN (DIPERBAIKI)
// =================================================================
router.get('/harian-detail', [checkAuth, checkAdmin], async (req, res) => {
    try {
        const { bulan, tahun } = req.query;
        if (!bulan || !tahun) {
            return res.status(400).json({ message: "Parameter bulan dan tahun dibutuhkan." });
        }

        // Langkah 1: Ambil data mentah harian (tetap sama)
        const queryPresensi = "SELECT id_guru, tanggal, status FROM presensi WHERE MONTH(tanggal) = ? AND YEAR(tanggal) = ?";
        const [dataPresensi] = await db.execute(queryPresensi, [bulan, tahun]);
        
        // Langkah 2: Ambil juga data rekapitulasi yang akurat (logika dari endpoint /bulanan)
        const totalHariKerja = getWorkingDaysInMonth(parseInt(tahun), parseInt(bulan));
        const queryRekap = `
            SELECT g.id_guru, g.nama_lengkap, g.nip_nipppk,
              COALESCE(p.total_hadir, 0) AS hadir,
              COALESCE(i.total_sakit, 0) AS sakit,
              COALESCE(i.total_izin, 0) AS izin
            FROM guru g
            LEFT JOIN (
              SELECT id_guru, COUNT(*) AS total_hadir FROM presensi WHERE (status = 'Hadir' OR status = 'Terlambat') AND MONTH(tanggal) = ? AND YEAR(tanggal) = ? GROUP BY id_guru
            ) p ON g.id_guru = p.id_guru
            LEFT JOIN (
              SELECT id_guru, SUM(CASE WHEN jenis_izin = 'Sakit' THEN 1 ELSE 0 END) AS total_sakit, SUM(CASE WHEN jenis_izin = 'Izin' THEN 1 ELSE 0 END) AS total_izin FROM izin_sakit_tugas WHERE status = 'Disetujui' AND MONTH(tanggal_mulai) = ? AND YEAR(tanggal_mulai) = ? GROUP BY id_guru
            ) i ON g.id_guru = i.id_guru
            WHERE g.status = 'Aktif';
        `;
        const [rowsRekap] = await db.query(queryRekap, [bulan, tahun, bulan, tahun]);
        const dataRekap = rowsRekap.map(guru => {
            const totalKehadiran = parseInt(guru.hadir) + parseInt(guru.sakit) + parseInt(guru.izin);
            let alpa = totalHariKerja - totalKehadiran;
            if (alpa < 0) { alpa = 0; }
            return { ...guru, alpa: alpa };
        });

        // Langkah 3: Kirim keduanya dalam satu paket
        res.json({
            daftarGuru: dataRekap, // Gunakan ini sebagai daftar guru utama
            dataPresensi: dataPresensi,
            dataRekapFinal: dataRekap // Kirim data rekap terpisah
        });

    } catch (error) {
        console.error("Error saat memproses laporan detail:", error);
        res.status(500).json({ message: "Terjadi kesalahan di server." });
    }
});

// =================================================================
// ENDPOINT LAPORAN BULANAN (TIDAK ADA PERUBAHAN)
// =================================================================
router.get('/bulanan', [checkAuth, checkAdmin], async (req, res) => {
    // ... isi kode endpoint /bulanan Anda biarkan apa adanya ...
    const { bulan, tahun } = req.query;
    if (!bulan || !tahun) {
        return res.status(400).json({ message: "Parameter 'bulan' dan 'tahun' wajib diisi." });
    }
    try {
        const totalHariKerja = getWorkingDaysInMonth(parseInt(tahun), parseInt(bulan));
        const query = `
          SELECT g.id_guru, g.nama_lengkap, g.nip_nipppk,
            COALESCE(p.total_hadir, 0) AS hadir,
            COALESCE(p.total_terlambat, 0) AS terlambat,
            COALESCE(i.total_sakit, 0) AS sakit,
            COALESCE(i.total_izin, 0) AS izin
          FROM guru g
          LEFT JOIN (
            SELECT id_guru, COUNT(*) AS total_hadir, SUM(CASE WHEN status = 'Terlambat' THEN 1 ELSE 0 END) AS total_terlambat
            FROM presensi WHERE MONTH(tanggal) = ? AND YEAR(tanggal) = ? GROUP BY id_guru
          ) p ON g.id_guru = p.id_guru
          LEFT JOIN (
            SELECT id_guru, SUM(CASE WHEN jenis_izin = 'Sakit' THEN 1 ELSE 0 END) AS total_sakit, SUM(CASE WHEN jenis_izin = 'Izin' THEN 1 ELSE 0 END) AS total_izin
            FROM izin_sakit_tugas WHERE status = 'Disetujui' AND MONTH(tanggal_mulai) = ? AND YEAR(tanggal_mulai) = ? GROUP BY id_guru
          ) i ON g.id_guru = i.id_guru
          WHERE g.status = 'Aktif';
        `;
        const [rows] = await db.query(query, [bulan, tahun, bulan, tahun]);
        const laporan = rows.map(guru => {
          const totalKehadiran = parseInt(guru.hadir) + parseInt(guru.sakit) + parseInt(guru.izin);
          let alpa = totalHariKerja - totalKehadiran;
          if (alpa < 0) { alpa = 0; }
          return { ...guru, alpa: alpa };
        });
        res.status(200).json(laporan);
    } catch (error) {
        console.error("Error saat membuat laporan:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// =================================================================
// ENDPOINT AKUN AWAL GURU (TIDAK ADA PERUBAHAN)
// =================================================================
function generateRandomPassword() {
    return crypto.randomBytes(4).toString('hex');
}
router.get('/akun-awal-guru', [checkAuth, checkAdmin], async (req, res) => {
    try {
        const querySelect = "SELECT id_guru, nama_lengkap, email FROM guru WHERE role != 'Admin';";
        const [guruList] = await db.query(querySelect);
        if (guruList.length === 0) { return res.status(200).json([]); }
        const credentials = [];
        for (const guru of guruList) {
            const newPassword = generateRandomPassword();
            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);
            const queryUpdate = "UPDATE guru SET password_hash = ? WHERE id_guru = ?;";
            await db.query(queryUpdate, [newPasswordHash, guru.id_guru]);
            credentials.push({
                nama_lengkap: guru.nama_lengkap,
                email: guru.email,
                password_awal: newPassword
            });
        }
        res.status(200).json(credentials);
    } catch (error) {
        console.error("Error saat generate kredensial awal:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;