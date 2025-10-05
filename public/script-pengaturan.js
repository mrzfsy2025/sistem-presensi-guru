// File: /public/script-pengaturan.js

document.addEventListener('DOMContentLoaded', function() {
    // Referensi ke elemen form
    const form = document.getElementById('form-pengaturan');
    const inputLat = document.getElementById('school_lat');
    const inputLon = document.getElementById('school_lon');
    const inputRadius = document.getElementById('radius_meter');
    const inputBatasJam = document.getElementById('batas_jam_masuk');
    const token = localStorage.getItem('token');

    // =================================================================
    // BAGIAN A: Mengambil dan Menampilkan Pengaturan Saat Ini
    // =================================================================
    async function muatPengaturan() {
        try {
            const response = await fetch('/api/pengaturan', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!response.ok) throw new Error('Gagal memuat data pengaturan.');
            
            const settings = await response.json();
            
            // Isi nilai form dengan data dari server
            inputLat.value = settings.school_lat;
            inputLon.value = settings.school_lon;
            inputRadius.value = settings.radius_meter;
            inputBatasJam.value = settings.batas_jam_masuk;

        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    // =================================================================
    // BAGIAN B: Mengirim Perubahan Saat Form Disubmit
    // =================================================================
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const dataUpdate = {
            school_lat: inputLat.value,
            school_lon: inputLon.value,
            radius_meter: inputRadius.value,
            batas_jam_masuk: inputBatasJam.value
        };

        try {
            const response = await fetch('/api/pengaturan', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataUpdate)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Gagal menyimpan pengaturan.');
            }

            const hasil = await response.json();
            alert(hasil.message); // "Pengaturan berhasil diperbarui."

        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Panggil fungsi untuk memuat pengaturan saat halaman dibuka
    muatPengaturan();
});