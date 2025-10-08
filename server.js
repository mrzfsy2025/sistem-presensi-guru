// File: /ABSENSI/server.js (VERSI FINAL)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// =============================================================
// MENGHUBUNGKAN RUTE API YANG SUDAH KITA BUAT
// =============================================================
const authRoutes = require('./routes/auth');
const guruRoutes = require('./routes/guru');
const presensiRoutes = require('./routes/presensi');
const izinRoutes = require('./routes/izin');
const adminGuruRoutes = require('./routes/adminGuru');
const dashboardRoutes = require('./routes/dashboard');
const adminIzinRoutes = require('./routes/adminIzin');
const laporanRoutes = require('./routes/laporan');
const pengaturanRoutes = require('./routes/pengaturan');

// Daftarkan rute-rute tersebut
app.use('/api/auth', authRoutes);
app.use('/api/guru', guruRoutes);
app.use('/api/presensi', presensiRoutes);
app.use('/api/izin', izinRoutes);
app.use('/api/admin/guru', adminGuruRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/izin', adminIzinRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/pengaturan', pengaturanRoutes);

const PORT = process.env.PORT || 8080; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
});

module.exports = app;