// =================================================================
// routes/adminIzin.js
// =================================================================

const express = require('express');
const router = express.Router();
const db = require('../database'); 
const { checkAuth, checkAdmin } = require('../middleware/auth');

// =================================================================
// BAGIAN 1: READ (Melihat semua pengajuan izin)
// METHOD: GET, ENDPOINT: /api/admin/izin
// =================================================================
router.get('/', [checkAuth, checkAdmin], async (req, res) => {
  try {
    // Query ini menggabungkan (JOIN) tabel izin dengan tabel guru
    // agar kita bisa menampilkan nama guru yang mengajukan.
    const query = `
      SELECT 
        iz.id_izin, 
        iz.tanggal_mulai, 
        iz.tanggal_selesai, 
        iz.jenis_izin, 
        iz.keterangan, 
        iz.status, 
        gu.nama_lengkap 
      FROM izin_sakit_tugas AS iz
      JOIN guru AS gu ON iz.id_guru = gu.id_guru
      ORDER BY iz.tanggal_mulai DESC;
    `;
    const [rows] = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error saat mengambil data izin:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});

// =================================================================
// BAGIAN 2: UPDATE (Menyetujui atau menolak izin)
// METHOD: PUT, ENDPOINT: /api/admin/izin/:id_izin/status
// =================================================================
  router.put('/:id_izin/status', [checkAuth, checkAdmin], async (req, res) => {
  const { id_izin } = req.params;
  const { status } = req.body; // Status baru: "Disetujui" atau "Ditolak"

  // Validasi input status
  if (!status || !['Disetujui', 'Ditolak'].includes(status)) {
    return res.status(400).json({ message: "Status tidak valid. Gunakan 'Disetujui' atau 'Ditolak'." });
  }

  try {
    const query = "UPDATE izin_sakit_tugas SET status = ? WHERE id_izin = ?;";
    const [result] = await db.query(query, [status, id_izin]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data pengajuan izin tidak ditemukan." });
    }

    res.status(200).json({ message: `Pengajuan izin berhasil diubah menjadi '${status}'.` });
  } catch (error) {
    console.error("Error saat memperbarui status izin:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});

module.exports = router;