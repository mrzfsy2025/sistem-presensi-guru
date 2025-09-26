// =================================================================
// routes/adminGuru.js
// =================================================================

// Import library yang dibutuhkan
const express = require('express');
const bcrypt = require('bcryptjs'); // Untuk enkripsi password
const router = express.Router();

// Import koneksi database (asumsi Anda punya file ini)
const db = require('../database'); 

// Import middleware untuk otentikasi (asumsi Anda punya file ini)
  // const { isAdmin } = require('../middleware/auth');

// =================================================================
// BAGIAN 1: READ (Melihat semua data guru)
// METHOD: GET, ENDPOINT: /api/admin/guru
// =================================================================
router.get('/', async (req, res) => {
  try {
    const query = "SELECT id_guru, nama_lengkap, nip_nipppk, jabatan, email, status FROM guru ORDER BY nama_lengkap ASC;";
    const [rows] = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error saat mengambil data guru:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});
// =================================================================
// BAGIAN 1.5: READ ONE (Melihat data satu guru)
// METHOD: GET, ENDPOINT: /api/admin/guru/:id_guru
// =================================================================
router.get('/:id_guru', async (req, res) => {
  try {
    const { id_guru } = req.params;
    const query = "SELECT id_guru, nama_lengkap, nip_nipppk, jabatan, email FROM guru WHERE id_guru = $1;";
    const [rows] = await db.query(query, [id_guru]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Data guru tidak ditemukan." });
    }
    
    res.status(200).json(rows[0]); // Kirim objek pertama, bukan array
  } catch (error) {
    console.error("Error saat mengambil data guru:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});

// =================================================================
// BAGIAN 2: CREATE (Membuat guru baru)
// METHOD: POST, ENDPOINT: /api/admin/guru
// =================================================================
router.post('/', async (req, res) => {
  const { nama_lengkap, nip_nipppk, jabatan, email, password } = req.body;

  // Validasi data dasar
  if (!nama_lengkap || !nip_nipppk || !email || !password) {
    return res.status(400).json({ message: "Semua kolom wajib diisi." });
  }

  try {
    // 1. Enkripsi password sebelum disimpan
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 2. Simpan ke database
    const query = "INSERT INTO guru (nama_lengkap, nip_nipppk, jabatan, email, password_hash, status) VALUES ($1, $2, $3, $4, $5, $6);";
    await db.query(query, [nama_lengkap, nip_nipppk, jabatan, email, password_hash, 'Aktif']);
  
    res.status(201).json({ message: "Guru baru berhasil ditambahkan." });
  } catch (error) {
    // Tangani error jika NIP/email sudah ada (unique constraint)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "NIP/nipppk atau email sudah terdaftar." });
    }
    console.error("Error saat membuat guru baru:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});

// =================================================================
// BAGIAN 3: UPDATE (Memperbarui data guru)
// METHOD: PUT, ENDPOINT: /api/admin/guru/:id_guru
// =================================================================
router.put('/:id_guru', async (req, res) => {
  const { id_guru } = req.params;
  const { nama_lengkap, nip_nipppk, jabatan, email } = req.body;

  if (!nama_lengkap || !nip_nipppk || !email) {
    return res.status(400).json({ message: "Nama, NIP/nipppk, dan email wajib diisi." });
  }

  try {
    const query = "UPDATE guru SET nama_lengkap = $1, nip_nipppk = $2, jabatan = $3, email = $4 WHERE id_guru = $5;";
    const [result] = await db.query(query, [nama_lengkap, nip_nipppk, jabatan, email, id_guru]);

    // Jika tidak ada baris yang ter-update, berarti ID tidak ditemukan
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data guru tidak ditemukan." });
    }

    res.status(200).json({ message: "Data guru berhasil diperbarui." });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "NIP/nipppk atau email sudah digunakan oleh guru lain." });
    }
    console.error("Error saat memperbarui data guru:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});

// =================================================================
// BAGIAN 4: DELETE (Menonaktifkan guru - Soft Delete)
// METHOD: DELETE, ENDPOINT: /api/admin/guru/:id_guru
// =================================================================
router.delete('/:id_guru', async (req, res) => {
  const { id_guru } = req.params;

  try {
    const query = "UPDATE guru SET status = 'Tidak Aktif' WHERE id_guru = $1;";
    const [result] = await db.query(query, [id_guru]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data guru tidak ditemukan." });
    }

    res.status(200).json({ message: "Data guru berhasil dinonaktifkan." });
  } catch (error) {
    console.error("Error saat menonaktifkan guru:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});


// Jangan lupa export router-nya agar bisa digunakan di file utama
module.exports = router;