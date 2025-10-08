// =================================================================
// script-guru.js (VERSI FINAL)
// Logika Frontend untuk Manajemen Guru
// =================================================================

// =================================================================
// BAGIAN A: INISIALISASI & FUNGSI UTAMA
// =================================================================

// Simpan referensi ke modal Bootstrap untuk digunakan nanti
const tambahModal = new bootstrap.Modal(document.getElementById('tambahGuruModal'));
const editModal = new bootstrap.Modal(document.getElementById('editGuruModal'));
const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));

// Titik masuk utama: Panggil fungsi-fungsi ini saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', function() {
    muatDataGuru();
    setupEventListeners();
});

/**
 * Mengambil data guru dari API dan menampilkannya di tabel.
 */
async function muatDataGuru() {
    const tabelBody = document.getElementById('tabel-guru-body');
    tabelBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Memuat data guru...</td></tr>`;
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/admin/guru', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Gagal memuat data guru dari server.');
        
        const paraGuru = await response.json();
        tabelBody.innerHTML = ''; // Kosongkan tabel sebelum diisi

        if (paraGuru.length === 0) {
            tabelBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Belum ada data guru. Silakan tambahkan.</td></tr>`;
            return;
        }

        paraGuru.forEach(guru => {
            const statusBadge = guru.status === 'Aktif' 
                ? `<span class="badge bg-success">${guru.status}</span>`
                : `<span class="badge bg-secondary">${guru.status}</span>`;
            
            const baris = `
                <tr id="baris-guru-${guru.id_guru}">
                    <td>${guru.nama_lengkap}</td>
                    <td>${guru.nip_nipppk}</td>
                    <td>${guru.jabatan}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-info btn-sm edit-guru-btn" data-id="${guru.id_guru}"><i class="bi bi-pencil-square"></i> Edit</button>
                        <button class="btn btn-danger btn-sm hapus-guru-btn" data-id="${guru.id_guru}" data-nama="${guru.nama_lengkap}"><i class="bi bi-trash-fill"></i> Hapus</button>
                        <button class="btn btn-warning btn-sm reset-guru-btn" data-id="${guru.id_guru}" data-nama="${guru.nama_lengkap}">Reset Password</button>
                    </td>
                </tr>
            `;
            tabelBody.innerHTML += baris;
        });
    } catch (error) {
        tabelBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

// =================================================================
// BAGIAN B: PENGATURAN SEMUA EVENT LISTENERS
// =================================================================

/**
 * Mengatur semua event listener untuk form dan tombol-tombol dinamis.
 */
function setupEventListeners() {
    
    // Listener untuk tombol-tombol di dalam tabel (Edit, Hapus, Reset)
    document.getElementById('tabel-guru-body').addEventListener('click', function(event) {
        const tombol = event.target.closest('button'); // Dapatkan elemen tombol, bahkan jika ikon yang diklik
        if (!tombol) return;

        const id = tombol.dataset.id;
        const nama = tombol.dataset.nama;

        if (tombol.classList.contains('edit-guru-btn')) {
            bukaFormEdit(id);
        } else if (tombol.classList.contains('hapus-guru-btn')) {
            HapusGuru(id, nama, tombol);
        } else if (tombol.classList.contains('reset-guru-btn')) {
            bukaFormReset(id, nama);
        }
    });

    // Listener untuk form TAMBAH guru
    document.getElementById('form-tambah-guru').addEventListener('submit', async function(event) {
        event.preventDefault();
        const dataGuruBaru = {
            nama_lengkap: document.getElementById('tambah-nama').value,
            nip_nipppk: document.getElementById('tambah-nip').value,
            jabatan: document.getElementById('tambah-jabatan').value,
            email: document.getElementById('tambah-email').value,
            password: document.getElementById('tambah-password').value
        };
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/guru', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify(dataGuruBaru)
            });
            const hasil = await response.json();
            if (!response.ok) throw new Error(hasil.message);
            
            alert(hasil.message);
            this.reset();
            tambahModal.hide();
            muatDataGuru(); // Muat ulang data setelah berhasil
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Listener untuk form EDIT guru
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
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/guru/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify(dataUpdate)
            });
            const hasil = await response.json();
            if (!response.ok) throw new Error(hasil.message);

            alert(hasil.message);
            editModal.hide();
            muatDataGuru(); // Muat ulang data setelah berhasil
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Listener untuk form RESET PASSWORD
    document.getElementById('form-reset-password').addEventListener('submit', async function(event) {
        event.preventDefault();
        const id = document.getElementById('reset-id-guru').value;
        const password_baru = document.getElementById('password-baru-input').value;
        
        if (!confirm(`Anda yakin ingin mereset password untuk guru ini?`)) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/guru/${id}/reset-password`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ password_baru: password_baru })
            });
            const hasil = await response.json();
            if (!response.ok) throw new Error(hasil.message);
            
            alert(hasil.message);
            resetPasswordModal.hide();
            this.reset();
        } catch(error) {
            alert(`Error: ${error.message}`);
        }
    });
}

// =================================================================
// BAGIAN C: FUNGSI-FUNGSI HANDLER (Aksi untuk setiap tombol)
// =================================================================

/**
 * Membuka modal Edit dan mengisi form dengan data guru yang dipilih.
 * @param {number} id - ID guru yang akan diedit.
 */
async function bukaFormEdit(id) {
    try {
        const token = localStorage.getItem('token');
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

/**
 * Membuka modal untuk mereset password.
 * @param {number} id - ID guru.
 * @param {string} nama - Nama lengkap guru untuk ditampilkan di modal.
 */
function bukaFormReset(id, nama) {
    document.getElementById('reset-id-guru').value = id;
    document.getElementById('nama-guru-reset').textContent = nama;
    document.getElementById('form-reset-password').reset();
    resetPasswordModal.show();
}

/**
 * Memproses penghapusan data guru secara permanen.
 * @param {number} id - ID guru yang akan dihapus.
 * @param {string} nama - Nama guru untuk konfirmasi.
 * @param {HTMLElement} elementTombol - Referensi ke tombol yang diklik.
 */
async function HapusGuru(id, nama, elementTombol) {
    const konfirmasi = confirm(
        `PERINGATAN!\n\nAnda akan menghapus data guru "${nama}" secara permanen. Semua data presensi dan izin terkait juga akan terhapus.\n\nApakah Anda yakin? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!konfirmasi) return;

    const token = localStorage.getItem('token');
    try {
        elementTombol.disabled = true;
        elementTombol.innerHTML = '<i class="bi bi-hourglass-split"></i>'; // Ganti ikon saat proses

        const response = await fetch(`/api/admin/guru/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        alert(data.message);
        document.getElementById(`baris-guru-${id}`).remove(); // Hapus baris dari tabel
    } catch (error) {
        alert(`Gagal menghapus: ${error.message}`);
        elementTombol.disabled = false;
        elementTombol.innerHTML = '<i class="bi bi-trash-fill"></i> Hapus'; // Kembalikan seperti semula jika gagal
    tambahModal.hide();
    editModal.hide();
    resetPasswordModal.hide();
    }
}