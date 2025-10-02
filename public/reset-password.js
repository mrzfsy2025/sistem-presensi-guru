document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('resetForm');
    const resetStatus = document.getElementById('resetStatus');

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (!token) {
        resetStatus.textContent = "Token tidak ditemukan. Link tidak valid.";
        resetStatus.style.color = 'red';
        resetForm.style.display = 'none';
        return;
    }
    
    // Masukkan token ke dalam input hidden di form
    document.getElementById('token').value = token;

    resetForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            resetStatus.textContent = "Password dan konfirmasi tidak cocok!";
            resetStatus.style.color = 'red';
            return;
        }

        resetStatus.textContent = 'Memproses...';

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: token, newPassword: newPassword })
            });

            const result = await response.json();

            if (response.ok) {
                resetStatus.textContent = result.message;
                resetStatus.style.color = 'green';
                resetForm.style.display = 'none'; // Sembunyikan form setelah berhasil
            } else {
                throw new Error(result.message || 'Gagal mereset password.');
            }
        } catch (error) {
            resetStatus.textContent = 'Error: ' + error.message;
            resetStatus.style.color = 'red';
        }
    });
});