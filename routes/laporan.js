// =================================================================
// routes/laporan.js
// =================================================================

const express = require('express');
const router = express.Router();
const db = require('../database'); 
const { isAdmin } = require('../middleware/auth');

// =================================================================
// FUNGSI BANTUAN: Menghitung hari kerja dalam sebulan
// (Mengabaikan hari Minggu)
// =================================================================
const getWorkingDaysInMonth = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    // getDay() mengembalikan 0 untuk Minggu, 1 untuk Senin, dst.
    if (currentDate.getDay() !== 0) { // Jika bukan hari Minggu
      workingDays++;
    }
  }
  return workingDays;
};

// =================================================================
// ENDPOINT UTAMA: Membuat Laporan Bulanan
// METHOD: GET, ENDPOINT: /api/laporan/bulanan?bulan=9&tahun=2025
// =================================================================
router.get('/bulanan', isAdmin, async (req, res) => {
  const { bulan, tahun } = req.query;

  if (!bulan || !tahun) {
    return res.status(400).json({ message: "Parameter 'bulan' dan 'tahun' wajib diisi." });
  }

  try {
    // 1. Hitung total hari kerja di bulan dan tahun yang dipilih
    const totalHariKerja = getWorkingDaysInMonth(parseInt(tahun), parseInt(bulan));

    // 2. Query utama yang menggabungkan data dari 3 tabel
    const query = `
      SELECT
        g.id_guru,
        g.nama_lengkap,
        g.nip_nuptk,
        COALESCE(p.total_hadir, 0) AS hadir,
        COALESCE(p.total_terlambat, 0) AS terlambat,
        COALESCE(i.total_sakit, 0) AS sakit,
        COALESCE(i.total_izin, 0) AS izin
      FROM guru g
      LEFT JOIN (
        SELECT
          id_guru,
          COUNT(*) AS total_hadir,
          SUM(CASE WHEN status = 'Terlambat' THEN 1 ELSE 0 END) AS total_terlambat
        FROM presensi
        WHERE MONTH(tanggal) = ? AND YEAR(tanggal) = ?
        GROUP BY id_guru
      ) p ON g.id_guru = p.id_guru
      LEFT JOIN (
        SELECT
          id_guru,
          SUM(CASE WHEN jenis_izin = 'Sakit' THEN 1 ELSE 0 END) AS total_sakit,
          SUM(CASE WHEN jenis_izin = 'Izin' THEN 1 ELSE 0 END) AS total_izin
        FROM izin_sakit_tugas
        WHERE status = 'Disetujui' AND MONTH(tanggal_mulai) = ? AND YEAR(tanggal_mulai) = ?
        GROUP BY id_guru
      ) i ON g.id_guru = i.id_guru
      WHERE g.status = 'Aktif';
    `;
    
    const [rows] = await db.query(query, [bulan, tahun, bulan, tahun]);

    // 3. Proses hasil query untuk menghitung 'Alpa'
    const laporan = rows.map(guru => {
      const totalKehadiran = parseInt(guru.hadir) + parseInt(guru.sakit) + parseInt(guru.izin);
      let alpa = totalHariKerja - totalKehadiran;
      
      // Pastikan alpa tidak negatif
      if (alpa < 0) {
        alpa = 0;
      }

      return {
        ...guru,
        alpa: alpa
      };
    });

    res.status(200).json(laporan);

  } catch (error) {
    console.error("Error saat membuat laporan:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});

module.exports = router;