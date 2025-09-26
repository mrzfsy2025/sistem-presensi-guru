// File: /ABSENSI/server.js (VERSI FINAL)

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// =============================================================
// MENGHUBUNGKAN SEMUA RUTE API
// =============================================================
const adminGuruRoutes = require('./routes/adminGuru');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const adminIzinRoutes = require('./routes/adminIzin');
const laporanRoutes = require('./routes/laporan');
const adminPresensiRoutes = require('./routes/adminPresensi');
const guruRoutes = require('./routes/guru');
const presensiRoutes = require('./routes/presensi');
const izinRoutes = require('./routes/izin');

app.use('/api/admin/guru', adminGuruRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/izin', adminIzinRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/admin/presensi', adminPresensiRoutes);
app.use('/api/guru', guruRoutes);
app.use('/api/presensi', presensiRoutes);
app.use('/api/izin', izinRoutes);

// =============================================================
// MENJALANKAN SERVER
// =============================================================
const PORT = process.env.PORT || 8080; 

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
});