// =================================================================
// routes/adminGuru.js
// =================================================================
const express = require('express');
const bcrypt = require('bcryptjs'); 
const router = express.Router();
const db = require('../database'); 
const { checkAuth, checkAdmin } = require('../middleware/auth');

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
    const query = "SELECT id_guru, nama_lengkap, nip_nipppk, jabatan, email FROM guru WHERE id_guru = ?;";
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
    const query = "INSERT INTO guru (nama_lengkap, nip_nipppk, jabatan, email, password_hash, status) VALUES (?, ?, ?, ?, ?, ?);";
    await db.query(query, [nama_lengkap, nip_nipppk, jabatan, email, password_hash, 'Aktif']);
  
    res.status(201).json({ message: "Guru baru berhasil ditambahkan." });
  } catch (error) {
    // Tangani error jika NIP/email sudah ada (unique constraint)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "NIP/NIPPPK atau email sudah terdaftar." });
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
    return res.status(400).json({ message: "Nama, NIP/NIPPPK, dan email wajib diisi." });
  }

  try {
    const query = "UPDATE guru SET nama_lengkap = ?, nip_nipppk = ?, jabatan = ?, email = ? WHERE id_guru = ?;";
    const [result] = await db.query(query, [nama_lengkap, nip_nipppk, jabatan, email, id_guru]);

    // Jika tidak ada baris yang ter-update, berarti ID tidak ditemukan
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data guru tidak ditemukan." });
    }

    res.status(200).json({ message: "Data guru berhasil diperbarui." });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "NIP/NIPPPK atau email sudah digunakan oleh guru lain." });
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
    const query = "UPDATE guru SET status = 'Tidak Aktif' WHERE id_guru = ?;";
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
// =================================================================
// BAGIAN 5: RESET (Reset - Password)
// METHOD: Reset-Password, ENDPOINT: /api/auth/forgot-password/:id_guru
// =================================================================
router.post('/:id_guru/reset-password', [checkAuth, checkAdmin], async (req, res) => {
    const { id_guru } = req.params;
    const { password_baru } = req.body;

    if (!password_baru || password_baru.length < 6) {
        return res.status(400).json({ message: 'Password baru minimal harus 6 karakter.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash_baru = await bcrypt.hash(password_baru, salt);

        const [result] = await db.query(
            "UPDATE guru SET password_hash = ? WHERE id_guru = ?;",
            [password_hash_baru, id_guru]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Guru tidak ditemukan.' });
        }

        res.status(200).json({ message: 'Password guru berhasil direset.' });
    } catch (error) {
        console.error("Error saat reset password:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;