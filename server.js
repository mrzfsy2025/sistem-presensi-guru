// File: /ABSENSI/server.js

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080; 

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.listen(PORT, '0.0.0.0', () => { // <-- TAMBAHKAN '0.0.0.0'
    console.log(`Server berjalan di port ${PORT}`);
});

// =============================================================
// MENYAJIKAN FILE FRONTEND
// Ini akan mencari folder 'public' di dalam 'ABSENSI'
// =============================================================
app.use(express.static('public'));

// =============================================================
// MENGHUBUNGKAN RUTE API
// Ini akan mencari folder 'routes' di dalam 'ABSENSI'
// =============================================================
const adminGuruRoutes = require('./routes/adminGuru');
const dashboardRoutes = require('./routes/dashboard'); 
const authRoutes = require('./routes/auth');
const adminIzinRoutes = require('./routes/adminIzin');
const laporanRoutes = require('./routes/laporan');
const adminPresensiRoutes = require('./routes/adminPresensi');
const pengaturanRoutes = require('./routes/pengaturan');
const guruRoutes = require('./routes/guru');
const presensiRoutes = require('./routes/presensi');
const izinRoutes = require('./routes/izin');

// Memberitahu server untuk menggunakan rute tersebut
app.use('/api/admin/guru', adminGuruRoutes);
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/auth', authRoutes); 
app.use('/api/admin/izin', adminIzinRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/admin/presensi', adminPresensiRoutes);
app.use('/api/pengaturan', pengaturanRoutes);
app.use('/api/guru', guruRoutes);
app.use('/api/presensi', presensiRoutes);
app.use('/api/izin', izinRoutes);

// Menjalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
    console.log(`Buka halaman manajemen guru di: http://localhost:${port}/manajemen-guru.html`);
});