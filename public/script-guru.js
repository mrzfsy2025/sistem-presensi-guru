// =================================================================
// script-guru.js (VERSI PERBAIKAN)
// Logika Frontend untuk Manajemen Guru
// =================================================================

// Simpan referensi ke modal Bootstrap untuk digunakan nanti
const tambahModal = new bootstrap.Modal(document.getElementById('tambahGuruModal'));
const editModal = new bootstrap.Modal(document.getElementById('editGuruModal'));
const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));

// =================================================================
// BAGIAN A: READ (Menampilkan Daftar Guru Saat Halaman Dibuka)
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    muatDataGuru();
});

async function muatDataGuru() {
    const tabelBody = document.getElementById('tabel-guru-body');
    const token = localStorage.getItem('admin_token');

    try {
        const response = await fetch('/api/admin/guru', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Gagal memuat data.');
        const paraGuru = await response.json();
        tabelBody.innerHTML = '';

        if (paraGuru.length === 0) {
            const barisPesan = `<tr><td colspan="5" class="text-center text-muted">Belum ada data guru. Silakan tambahkan guru baru.</td></tr>`;
            tabelBody.innerHTML = barisPesan;
            return;
        }

        paraGuru.forEach(guru => {
            const statusBadge = guru.status === 'Aktif' 
                ? `<span class="badge bg-success">${guru.status}</span>`
                : `<span class="badge bg-danger">${guru.status}</span>`;
            const baris = `
                <tr id="baris-guru-${guru.id_guru}">
                    <td>${guru.nama_lengkap}</td>
                    <td>${guru.nip_nipppk}</td>
                    <td>${guru.jabatan}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="bukaFormEdit(${guru.id_guru})"><i class="bi bi-pencil-square"></i> Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="hapusGuru(${guru.id_guru})"><i class="bi bi-trash-fill"></i> Hapus</button>
                        <button class="btn btn-warning btn-sm" onclick="bukaFormReset(${guru.id_guru}, '${guru.nama_lengkap}')">Reset Password</button>
                    </td>
                    </tr>
            `;
            tabelBody.innerHTML += baris;
        });
    } catch (error) {
        tabelBody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
    }
}

// =================================================================
// BAGIAN B: DELETE (Mengaktifkan Tombol Hapus)
// =================================================================
async function hapusGuru(id) {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan guru dengan ID ${id}?`)) return;
    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`/api/admin/guru/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Gagal menghapus data.');
        const hasil = await response.json();
        alert(hasil.message);
        document.getElementById(`baris-guru-${id}`).remove();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// =================================================================
// BAGIAN C: UPDATE (Mengaktifkan Tombol Edit)
// =================================================================
async function bukaFormEdit(id) {
    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`/api/admin/guru/${id}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Gagal mengambil detail guru.');
        const guru = await response.json();
        
        document.getElementById('edit-id-guru').value = guru.id_guru;
        document.getElementById('edit-nama').value = guru.nama_lengkap;
        document.getElementById('edit-nip').value = guru.nip_nipppk;
        document.getElementById('edit-jabatan').value = guru.jabatan;
        document.getElementById('edit-email').value = guru.email;

        editModal.show();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}
// Event listener untuk menangani submit form edit
document.getElementById('form-edit-guru').addEventListener('submit', async function(event) {
    event.preventDefault();
    const id = document.getElementById('edit-id-guru').value;
    const dataUpdate = {
        nama_lengkap: document.getElementById('edit-nama').value,
        nip_nipppk: document.getElementById('edit-nip').value,
        jabatan: document.getElementById('edit-jabatan').value,
        email: document.getElementById('edit-email').value,
    };
    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`/api/admin/guru/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataUpdate)
        });
        if (!response.ok) {
             const err = await response.json();
             throw new Error(err.message);
        }
        const hasil = await response.json();
        alert(hasil.message);
        editModal.hide();
        muatDataGuru();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}); 

// =================================================================
// BAGIAN E: CREATE (Mengaktifkan Form Tambah Guru)
// =================================================================

document.getElementById('form-tambah-guru').addEventListener('submit', async function(event) {
    event.preventDefault();
    console.log("Form 'Tambah Guru' disubmit, proses fetch dimulai...");
    const dataGuruBaru = {
        nama_lengkap: document.getElementById('tambah-nama').value,
        nip_nipppk: document.getElementById('tambah-nip').value,
        jabatan: document.getElementById('tambah-jabatan').value,
        email: document.getElementById('tambah-email').value,
        password: document.getElementById('tambah-password').value
    };
    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch('/api/admin/guru', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataGuruBaru)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message);
        }
        const hasil = await response.json();
        console.log("Berhasil:", hasil.message);
        alert(hasil.message);
        this.reset();
        tambahModal.hide();
        muatDataGuru();
    } catch (error) {
        console.error("Terjadi error:", error.message);
        alert(`Error: ${error.message}`);
    }
});

// =================================================================
// BAGIAN BARU: LOGIKA UNTUK RESET PASSWORD OLEH ADMIN
// =================================================================

function bukaFormReset(id, nama) {
    document.getElementById('reset-id-guru').value = id;
    document.getElementById('nama-guru-reset').textContent = nama;
    resetPasswordModal.show();
}

// Event listener untuk menangani submit form reset password
document.getElementById('form-reset-password').addEventListener('submit', async function(event) {
    event.preventDefault();
    const id = document.getElementById('reset-id-guru').value;
    const password_baru = document.getElementById('password-baru-input').value;
    
    if (!confirm(`Anda yakin ingin mereset password untuk guru ini?`)) return;

    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`/api/admin/guru/${id}/reset-password`, {
            method: 'POST',
            headers: { 
                'Authorization': 'Bearer ' + token, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ password_baru: password_baru })
        });

        const hasil = await response.json();
        if (!response.ok) throw new Error(hasil.message);
        
        alert(hasil.message);
        resetPasswordModal.hide();
        this.reset(); // Kosongkan form setelah berhasil
    } catch(error) {
        alert(`Error: ${error.message}`);
    }
});