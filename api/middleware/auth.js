// File: /ABSENSI/middleware/auth.js (VERSI DISEMPURNAKAN)

const jwt = require('jsonwebtoken');

const JWT_SECRET = '1793-9Y$-.440';

// Middleware umum untuk memeriksa token (bisa dipakai admin/guru)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak disediakan.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Tempelkan data user (termasuk id_guru) ke request
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token tidak valid.' });
    }
};

// Kita bisa buat alias agar lebih mudah dibaca
const isAdmin = (req, res, next) => {
    // Pertama, verifikasi tokennya
    verifyToken(req, res, () => {
        // Setelah token valid, periksa rolenya
        if (req.user && req.user.role === 'Admin') {
            next(); // Lanjutkan jika dia adalah Admin
        } else {
            // Tolak jika bukan Admin
            res.status(403).json({ message: 'Akses ditolak. Hanya untuk Admin.' });
        }
    });
};
const isGuru = verifyToken;

// Export semua fungsi agar bisa dipakai di file lain
module.exports = {
    isAdmin,
    isGuru,
    verifyToken
};