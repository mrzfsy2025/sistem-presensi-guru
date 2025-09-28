// File: /public/auth-guard-admin.js

(function() {
    const token = localStorage.getItem('admin_token');

    if (!token) {
        // Jika tidak ada token sama sekali, paksa kembali ke login admin
        alert('Akses ditolak. Silakan login sebagai Admin.');
        window.location.href = 'login-admin.html';
        return;
    }

    try {
        // Decode token untuk melihat isinya (terutama role)
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Periksa apakah rolenya adalah 'Admin'
        if (payload.role !== 'Admin') {
            // Jika rolenya bukan 'Admin' (misalnya 'Guru'), tolak akses
            throw new Error('Akses hanya untuk Admin.');
        }
        // Jika dia Admin, biarkan halaman dimuat
        console.log('Akses Admin diberikan.');

    } catch (error) {
        // Jika token tidak valid atau rolenya salah
        alert('Akses ditolak. Anda tidak memiliki izin yang cukup.');
        localStorage.removeItem('admin_token'); // Hapus token yang salah
        window.location.href = 'login-admin.html'; // Paksa kembali ke login admin
    }
})();