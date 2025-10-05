// File: /ABSENSI/middleware/auth.js (DISEMPURNAKAN)

const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'kunci-rahasia-default';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak disediakan.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // data user (termasuk id_guru) ke request
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token tidak valid.' });
    }
};

const isAdmin = (req, res, next) => {
    // verifikasi tokennya
    verifyToken(req, res, () => {
        // token valid, periksa rolenya
        if (req.user && req.user.role === 'Admin') {
            next(); // Lanjutkan jika Admin
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