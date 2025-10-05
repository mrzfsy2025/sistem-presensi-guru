// File: /public/auth-guard-admin.js

(function() {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Akses ditolak. Silakan login sebagai Admin.');
        window.location.href = 'login-admin.html'; // Pastikan nama file login ini benar
        return;
    }

    try {
        // Decode token untuk melihat role
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Periksa apakah rolenya adalah 'Admin'
        if (payload.role !== 'Admin') {
            // Jika rolenya bukan 'Admin' tolak akses
            throw new Error('Akses hanya untuk Admin.');
        }
        // Jika Admin, halaman dimuat
        console.log('Akses Admin diberikan. Token valid.');

    } catch (error) {
        // Jika token tidak valid izin dicegat
        alert('Akses ditolak. Anda tidak memiliki izin yang cukup atau sesi Anda telah berakhir.');
        localStorage.removeItem('token'); // Hapus token yang salah
        window.location.href = 'login-admin.html'; // Paksa kembali ke login admin
    }
})();