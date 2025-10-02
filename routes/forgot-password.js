document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('forgotPasswordModal');
    const link = document.getElementById('forgotPasswordLink');
    const closeBtn = document.getElementById('closeModal');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const statusMessage = document.getElementById('statusMessage');

    // Tampilkan modal saat link "Lupa Password" diklik
    link.onclick = function(event) {
        event.preventDefault(); 
        modal.style.display = 'block';
        statusMessage.textContent = ''; 
    }

    // Sembunyikan modal saat tombol close (x) diklik
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    // Sembunyikan modal saat area di luar modal diklik
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    // Proses saat form lupa password di-submit
    forgotPasswordForm.addEventListener('submit', async function(event) {
        event.preventDefault(); 
        
        const email = document.getElementById('email').value;
        statusMessage.textContent = 'Memproses permintaan Anda...';

        try {
            // Inilah bagian yang memanggil API backend Anda
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
            });

            const result = await response.json();

            if (response.ok) {
                statusMessage.textContent = result.message; 
                statusMessage.style.color = 'green';
                forgotPasswordForm.reset(); 
            } else {
                throw new Error(result.message || 'Terjadi kesalahan.');
            }
        } catch (error) {
            statusMessage.textContent = 'Error: ' + error.message;
            statusMessage.style.color = 'red';
        }
    });
});