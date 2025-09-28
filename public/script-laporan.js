// File: /public/script-laporan.js

document.addEventListener('DOMContentLoaded', function() {
    // Referensi ke elemen-elemen HTML
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const tombolTampilkan = document.getElementById('tombol-tampilkan');
    const tombolCetak = document.getElementById('tombol-cetak');
    const tabelBody = document.getElementById('tabel-laporan-body');
    const judulLaporan = document.getElementById('judul-laporan');

    // =================================================================
    // BAGIAN A: Mengisi Opsi Filter Bulan dan Tahun
    // =================================================================
    function isiFilter() {
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const tanggalSekarang = new Date();
        const bulanSekarang = tanggalSekarang.getMonth(); // 0-11
        const tahunSekarang = tanggalSekarang.getFullYear();

        // Isi filter bulan
        namaBulan.forEach((nama, index) => {
            const opsi = new Option(nama, index + 1); // value: 1-12
            filterBulan.add(opsi);
        });
        filterBulan.value = bulanSekarang + 1; // Set bulan saat ini sebagai default

        // Isi filter tahun (5 tahun ke belakang)
        for (let i = 0; i < 5; i++) {
            const tahun = tahunSekarang - i;
            const opsi = new Option(tahun, tahun);
            filterTahun.add(opsi);
        }
    }
    
    // =================================================================
    // BAGIAN B: Mengambil dan Menampilkan Data Laporan
    // =================================================================
    async function tampilkanLaporan() {
        const bulan = filterBulan.value;
        const tahun = filterTahun.value;
        const namaBulanTerpilih = filterBulan.options[filterBulan.selectedIndex].text;
        const token = localStorage.getItem('admin_token');

        judulLaporan.textContent = `Laporan Kehadiran Bulan ${namaBulanTerpilih} Tahun ${tahun}`;
        tabelBody.innerHTML = `<tr><td colspan="8" class="text-muted">Memuat data...</td></tr>`;
        tombolCetak.disabled = true; // Nonaktifkan tombol cetak saat loading

        try {
            const response = await fetch(`/api/laporan/bulanan?bulan=${bulan}&tahun=${tahun}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!response.ok) throw new Error('Gagal mengambil data laporan.');
            
            const laporan = await response.json();
            tabelBody.innerHTML = ''; // Kosongkan tabel

            if (laporan.length === 0) {
                tabelBody.innerHTML = `<tr><td colspan="8" class="text-muted">Tidak ada data untuk periode ini.</td></tr>`;
                return;
            }

            // Isi tabel dengan data laporan
            laporan.forEach((guru, index) => {
                const baris = `
                    <tr>
                        <td>${index + 1}</td>
                        <td class="text-start">${guru.nama_lengkap}</td>
                        <td>${guru.nip_nipppk}</td>
                        <td>${guru.hadir}</td>
                        <td>${guru.sakit}</td>
                        <td>${guru.izin}</td>
                        <td>${guru.alpa}</td>
                        <td>${guru.terlambat}</td>
                    </tr>
                `;
                tabelBody.innerHTML += baris;
            });

            tombolCetak.disabled = false; // Aktifkan kembali tombol cetak

        } catch (error) {
            judulLaporan.textContent = '';
            tabelBody.innerHTML = `<tr><td colspan="8" class="text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    // =================================================================
    // BAGIAN C: Mengaktifkan Tombol Cetak
    // =================================================================
    tombolTampilkan.addEventListener('click', tampilkanLaporan);

    tombolCetak.addEventListener('click', () => {
        window.print(); 
    });

    // Panggil fungsi filter saat halaman pertama kali dimuat
    isiFilter();
});