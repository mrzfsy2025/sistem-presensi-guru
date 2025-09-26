// File: /api/index.js (Satu-satunya File Backend Anda)

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database'); // Pastikan database.js ada di dalam folder 'api'

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

// =============================================================
// MIDDLEWARE (Digabung ke sini)
// =============================================================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak disediakan.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token tidak valid.' });
    }
};

const isAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user && req.user.role === 'Admin') {
            next();
        } else {
            res.status(403).json({ message: 'Akses ditolak. Hanya untuk Admin.' });
        }
    });
};
const isGuru = verifyToken;

// =============================================================
// SEMUA RUTE API (Digabung dari semua file routes)
// =============================================================

// --- Rute dari auth.js ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi.' });
    try {
        const result = await db.query("SELECT * FROM guru WHERE email = $1 AND status = 'Aktif';", [email]);
        const guru = result.rows[0];
        if (!guru) return res.status(401).json({ message: 'Email atau password salah.' });
        
        const isPasswordMatch = await bcrypt.compare(password, guru.password_hash);
        if (!isPasswordMatch) return res.status(401).json({ message: 'Email atau password salah.' });
        
        const payload = { id_guru: guru.id_guru, nama: guru.nama_lengkap, email: guru.email, role: guru.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ message: 'Login berhasil!', token: token });
    } catch (error) {
        console.error("Error saat login:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// --- Rute dari guru.js ---
app.get('/api/guru/status', isGuru, async (req, res) => {
    const id_guru = req.user.id_guru;
    const tanggal_hari_ini = new Date().toISOString().slice(0, 10);
    try {
        const profilResult = await db.query("SELECT nama_lengkap, nip_nuptk, email FROM guru WHERE id_guru = $1;", [id_guru]);
        if (profilResult.rows.length === 0) return res.status(404).json({ message: 'Profil guru tidak ditemukan.' });

        const presensiResult = await db.query("SELECT jam_masuk, jam_pulang FROM presensi WHERE id_guru = $1 AND tanggal = $2;", [id_guru, tanggal_hari_ini]);
        
        let status_presensi = { kondisi: 'BELUM_MASUK', jam_masuk: null, jam_pulang: null };
        if (presensiResult.rows.length > 0) {
            const presensiHariIni = presensiResult.rows[0];
            status_presensi.jam_masuk = presensiHariIni.jam_masuk;
            if (presensiHariIni.jam_pulang) {
                status_presensi.kondisi = 'SUDAH_PULANG';
                status_presensi.jam_pulang = presensiHariIni.jam_pulang;
            } else {
                status_presensi.kondisi = 'SUDAH_MASUK';
            }
        }
        res.status(200).json({ profil: profilResult.rows[0], status_presensi: status_presensi });
    } catch (error) {
        console.error("Error saat mengambil status guru:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// --- Rute dari presensi.js ---
// (Disatukan di sini, pastikan Anda juga sudah membuat tabel `pengaturan` dan mengisinya)
let PENGATURAN = {};
async function loadPengaturan() {
    try {
        const result = await db.query("SELECT * FROM pengaturan;");
        PENGATURAN = result.rows.reduce((obj, item) => {
            obj[item.setting_key] = item.setting_value;
            return obj;
        }, {});
    } catch (error) {
        console.error("Gagal memuat pengaturan, menggunakan nilai default:", error);
        PENGATURAN = { school_lat: -3.7885, school_lon: 102.2600, radius_meter: 100, batas_jam_masuk: "07:30:00" };
    }
}
loadPengaturan();

app.post('/api/presensi/masuk', isGuru, async (req, res) => {
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
app.post('api/presensi/pulang', isGuru, async (req, res) => {
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
app.get('api/presensi/riwayat', isGuru, async (req, res) => {
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
module.exports = app;