// File: /public/script-izin.js

// =================================================================
// BAGIAN A: READ (Menampilkan Daftar Izin Saat Halaman Dibuka)
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    muatDataIzin();
});

async function muatDataIzin() {
    const tabelBody = document.getElementById('tabel-izin-body');
    const token = localStorage.getItem('admin_token');

    try {
        const response = await fetch('https://sistem-presensi-guru.vercel.app/api/admin/izin', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Gagal memuat data pengajuan izin.');

        const daftarIzin = await response.json();
        tabelBody.innerHTML = '';

        if (daftarIzin.length === 0) {
            tabelBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Tidak ada data pengajuan izin.</td></tr>`;
            return;
        }

        daftarIzin.forEach(izin => {
            const tanggal = new Date(izin.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            let statusBadge, aksiTombol;

            // Tentukan tampilan status dan tombol berdasarkan status izin
            switch (izin.status) {
                case 'Disetujui':
                    statusBadge = `<span class="badge bg-success">${izin.status}</span>`;
                    aksiTombol = `<span class="text-muted">Selesai</span>`;
                    break;
                case 'Ditolak':
                    statusBadge = `<span class="badge bg-danger">${izin.status}</span>`;
                    aksiTombol = `<span class="text-muted">Selesai</span>`;
                    break;
                default: // Menunggu Persetujuan
                    statusBadge = `<span class="badge bg-warning text-dark">${izin.status}</span>`;
                    aksiTombol = `
                        <button class="btn btn-success btn-sm me-1" onclick="updateStatusIzin(${izin.id_izin}, 'Disetujui')">Setujui</button>
                        <button class="btn btn-danger btn-sm" onclick="updateStatusIzin(${izin.id_izin}, 'Ditolak')">Tolak</button>
                    `;
            }

            const baris = `
                <tr id="baris-izin-${izin.id_izin}">
                    <td>${izin.nama_lengkap}</td>
                    <td>${tanggal}</td>
                    <td><span class="badge bg-secondary">${izin.jenis_izin}</span></td>
                    <td>${izin.keterangan}</td>
                    <td class="status-cell">${statusBadge}</td>
                    <td class="aksi-cell text-center">${aksiTombol}</td>
                </tr>
            `;
            tabelBody.innerHTML += baris;
        });
    } catch (error) {
        tabelBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

// =================================================================
// BAGIAN B: UPDATE (Mengaktifkan Tombol Aksi)
// =================================================================
async function updateStatusIzin(id, status) {
    if (!confirm(`Apakah Anda yakin ingin mengubah status pengajuan ini menjadi "${status}"?`)) {
        return;
    }

    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`https://sistem-presensi-guru.vercel.app/api/admin/izin/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status }) // Kirim status baru
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Gagal memperbarui status.');
        }

        const hasil = await response.json();
        alert(hasil.message);

        // Perbarui tampilan di baris yang sesuai tanpa me-reload halaman
        const baris = document.getElementById(`baris-izin-${id}`);
        const statusCell = baris.querySelector('.status-cell');

        if (status === 'Disetujui') {
            statusCell.innerHTML = `<span class="badge bg-success">Disetujui</span>`;
        } else {
            statusCell.innerHTML = `<span class="badge bg-danger">Ditolak</span>`;
        }
        
        // Ganti tombol dengan teks "Selesai"
        baris.querySelector('.aksi-cell').innerHTML = `<span class="text-muted">Selesai</span>`;

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}