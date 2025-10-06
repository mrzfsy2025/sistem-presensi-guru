// File: /routes/guru.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
const db = require('../database');
const { checkAuth } = require('../middleware/auth'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); 

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Di sisi server (misalnya, di file routes/guru.js)

router.get('/profil', checkAuth, async (req, res) => {
    // ID guru didapat dari token yang sudah diverifikasi oleh middleware checkAuth
    const id_guru = req.user.id_guru;

    try {
        const query = `
            SELECT id_guru, nama_lengkap, nip_nipppk, jabatan, status, foto_profil 
            FROM guru 
            WHERE id_guru = ?;
        `;
        const [rows] = await db.query(query, [id_guru]);

        // Cek apakah guru dengan ID tersebut ditemukan
        if (rows.length === 0) {
            return res.status(404).json({ message: "Data guru tidak ditemukan." });
        }

        // Jika ditemukan, kirim datanya sebagai respons JSON
        res.status(200).json(rows[0]);

    } catch (error) {
        console.error("Error saat mengambil data profil guru:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// --- ENDPOINT UNTUK UPLOAD FOTO PROFIL ---
// Middleware 'upload.single('fotoProfil')' untuk memproses satu file dari form field 'Foto_profile'
router.post('/profil/foto', checkAuth, upload.single('fotoProfil'), async (req, res) => {
  const id_guru = req.user.id_guru;

  // Cek apakah file berhasil di-upload oleh multer
  if (!req.file) {
    return res.status(400).json({ message: "Tidak ada file yang di-upload." });
  }
  const filePath = req.file.path.replace('public/', ''); 

  try {
    await db.query(
      "UPDATE guru SET foto_profil = ? WHERE id_guru = ?;",
      [filePath, id_guru]
    );

    res.status(200).json({ 
      message: "Foto profil berhasil diperbarui.",
      filePath: filePath // Kirim balik path file agar frontend bisa langsung menampilkannya
    });
  } catch (error) {
    console.error("Error saat update foto profil:", error);
    res.status(500).json({ message: "Terjadi error pada server." });
  }
});

// =================================================================
// ENDPOINT: Mengambil profil & status presensi guru yang sedang login
// METHOD: GET, URL: /api/guru/status
// =================================================================
router.get('/status', checkAuth, async (req, res) => {
    // ID guru didapat dari token yang sudah diverifikasi oleh middleware
    const id_guru = req.user.id_guru;
    const tanggal_hari_ini = new Date().toISOString().slice(0, 10);

    try {
        // Query 1: Ambil data profil guru
        const [profilRows] = await db.query(
            "SELECT nama_lengkap, nip_nipppk, email FROM guru WHERE id_guru = ?;", // Tambahkan email
            [id_guru]
        );
        if (profilRows.length === 0) {
            return res.status(404).json({ message: 'Profil guru tidak ditemukan.' });
        }

        // Query 2: Ambil data presensi hari ini
        const [presensiRows] = await db.query(
            "SELECT jam_masuk, jam_pulang FROM presensi WHERE id_guru = ? AND tanggal = ?;",
            [id_guru, tanggal_hari_ini]
        );

        // Tentukan status presensi berdasarkan hasil query
        let status_presensi = {
            kondisi: 'BELUM_MASUK',
            jam_masuk: null,
            jam_pulang: null
        };

        if (presensiRows.length > 0) {
            const presensiHariIni = presensiRows[0];
            if (presensiHariIni.jam_pulang) {
                status_presensi.kondisi = 'SUDAH_PULANG';
                status_presensi.jam_pulang = presensiHariIni.jam_pulang;
            } else {
                status_presensi.kondisi = 'SUDAH_MASUK';
            }
            status_presensi.jam_masuk = presensiHariIni.jam_masuk;
        }
        
        // Gabungkan semua data menjadi satu objek balasan
        const responseData = {
            profil: profilRows[0],
            status_presensi: status_presensi
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error saat mengambil status guru:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// =================================================================
// ENDPOINT: Guru mengubah password-nya sendiri
// METHOD: PUT, URL: /api/guru/profile/password
// =================================================================
router.put('/profile/password', checkAuth, async (req, res) => {
    // Ambil ID guru dari token yang sudah terverifikasi
    const id_guru = req.user.id_guru;
    const { password_lama, password_baru, konfirmasi_password_baru } = req.body;

    // 1. Validasi input dari form
    if (!password_lama || !password_baru || !konfirmasi_password_baru) {
        return res.status(400).json({ message: "Semua kolom password wajib diisi." });
    }
    if (password_baru !== konfirmasi_password_baru) {
        return res.status(400).json({ message: "Password baru dan konfirmasi tidak cocok." });
    }
    if (password_baru.length < 6) {
        return res.status(400).json({ message: "Password baru minimal harus 6 karakter." });
    }

    try {
        // 2. Ambil hash password saat ini dari database untuk guru yang sedang login
        const [rows] = await db.query("SELECT password_hash FROM guru WHERE id_guru = ?;", [id_guru]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }
        const guru = rows[0];

        // 3. Verifikasi apakah password lama yang dimasukkan benar
        const isPasswordMatch = await bcrypt.compare(password_lama, guru.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Password lama yang Anda masukkan salah." });
        }

        // 4. Jika benar, hash password baru dan update ke database
        const salt = await bcrypt.genSalt(10);
        const password_hash_baru = await bcrypt.hash(password_baru, salt);

        await db.query("UPDATE guru SET password_hash = ? WHERE id_guru = ?;", [password_hash_baru, id_guru]);

        res.status(200).json({ message: "Password berhasil diperbarui." });

    } catch (error) {
        console.error("Error saat mengubah password:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});
router.put('/update-email', checkAuth, async (req, res) => {
    // 1. Ambil data dari request body dan user ID dari token
    const { new_email, current_password } = req.body;
    const id_guru = req.user.id_guru;

    // 2. Validasi input
    if (!new_email || !current_password) {
        return res.status(400).json({ message: 'Email baru dan password saat ini wajib diisi.' });
    }

    try {
        // 3. Periksa apakah email baru sudah digunakan oleh orang lain
        let query = "SELECT id_guru FROM guru WHERE email = ? AND id_guru != ?;";
        let [existingUser] = await db.query(query, [new_email, id_guru]);

        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Email ini sudah terdaftar. Silakan gunakan email lain.' });
        }

        // 4. Verifikasi password saat ini
        query = "SELECT password_hash, role, nama_lengkap FROM guru WHERE id_guru = ?;";
        const [rows] = await db.query(query, [id_guru]);
        const guru = rows[0];

        const isPasswordMatch = await bcrypt.compare(current_password, guru.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Password yang Anda masukkan salah.' });
        }

        // 5. Jika semua valid, update email di database
        query = "UPDATE guru SET email = ? WHERE id_guru = ?;";
        await db.query(query, [new_email, id_guru]);

        // 6. Buat token baru dengan email yang sudah diupdate
        const payload = {
            id_guru: id_guru,
            email: new_email, // Gunakan email baru di token baru
            role: guru.role,
            nama: guru.nama_lengkap
        };
        const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

        // 7. Kirim respons sukses beserta token baru
        res.status(200).json({ 
            message: 'Email berhasil diperbarui.',
            token: newToken // Kirim token baru agar frontend bisa memperbarui localStorage
        });

    } catch (error) {
        console.error("Error saat mengubah email:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;