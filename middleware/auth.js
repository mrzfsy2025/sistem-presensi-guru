// File: /ABSENSI/middleware/auth.js (DISEMPURNAKAN)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'kunci-rahasia-default';

// Middleware checkAuth (Otentikasi)
const checkAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token tidak valid.' });
        }
        req.user = user;
        next();
    });
};

// Middleware checkAdmin setelah checkAuth
const checkAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak. Rute ini khusus untuk Admin.' });
    }
};

// Ekspor kedua fungsi tersebut
module.exports = {
    checkAuth,
    checkAdmin
};
