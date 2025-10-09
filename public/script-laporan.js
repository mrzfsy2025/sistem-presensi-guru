// File: /public/script-laporan.js (SUDAH DIPERBAIKI)

document.addEventListener('DOMContentLoaded', function() {
    // Referensi ke elemen-elemen HTML
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const tombolTampilkan = document.getElementById('tombol-tampilkan');
    const tombolCetak = document.getElementById('tombol-cetak');
    const tombolExport = document.getElementById('exportExcelBtn');
    const getGuruDataBtn = document.getElementById('getGuruDataBtn');

    // Panggil fungsi untuk mengisi filter jika elemennya ada
    if (filterBulan && filterTahun) {
        isiFilter(filterBulan, filterTahun);
    }
    
    // Tambahkan event listener ke tombol-tombol
    if (tombolTampilkan) tombolTampilkan.addEventListener('click', tampilkanLaporan);
    if (tombolCetak) tombolCetak.addEventListener('click', () => window.print());
    if (tombolExport) tombolExport.addEventListener('click', exportLaporanExcel);
    if (getGuruDataBtn) getGuruDataBtn.addEventListener('click', buatDanTampilkanAkunAwal);
});

// =================================================================
// BAGIAN FUNGSI-FUNGSI LOGIKA
// =================================================================

function isiFilter(filterBulan, filterTahun) {
    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const tanggalSekarang = new Date();
    const bulanSekarang = tanggalSekarang.getMonth();
    const tahunSekarang = tanggalSekarang.getFullYear();

    namaBulan.forEach((nama, index) => {
        filterBulan.add(new Option(nama, index + 1));
    });
    filterBulan.value = bulanSekarang + 1;

    for (let i = 0; i < 5; i++) {
        const tahun = tahunSekarang - i;
        filterTahun.add(new Option(tahun, tahun));
    }
}

async function tampilkanLaporan() {
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const tabelBody = document.getElementById('tabel-laporan-body');
    const judulLaporan = document.getElementById('judul-laporan');
    const tombolCetak = document.getElementById('tombol-cetak');
    
    const bulan = filterBulan.value;
    const tahun = filterTahun.value;
    const namaBulanTerpilih = filterBulan.options[filterBulan.selectedIndex].text;
    const token = localStorage.getItem('token');

    judulLaporan.textContent = `Laporan Kehadiran Bulan ${namaBulanTerpilih} Tahun ${tahun}`;
    tabelBody.innerHTML = `<tr><td colspan="8" class="text-muted">Memuat data dari server...</td></tr>`;
    tombolCetak.disabled = true;
    
    // Hapus variabel global yang tidak diperlukan lagi
    // window.daftarGuru = null;
    // window.dataPresensi = null;

    try {
        // =================================================================
        // PERUBAHAN UTAMA: Panggil endpoint /bulanan yang sudah benar
        // =================================================================
        const response = await fetch(`/api/laporan/bulanan?bulan=${bulan}&tahun=${tahun}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Gagal mengambil data laporan.' }));
            throw new Error(errorData.message);
        }
        
        // Data yang diterima sudah matang dan siap ditampilkan
        const dataLaporan = await response.json();
        window.laporanData = dataLaporan;
        tabelBody.innerHTML = ''; 

        if (!dataLaporan || dataLaporan.length === 0) {
            tabelBody.innerHTML = `<tr><td colspan="8" class="text-muted">Tidak ada data guru untuk periode ini.</td></tr>`;
            return;
        }
        
        // =================================================================
        // PERUBAHAN UTAMA: Langsung tampilkan data, tidak perlu menghitung lagi
        // =================================================================
        dataLaporan.forEach((guru, index) => {
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
                </tr>`;
            tabelBody.innerHTML += baris;
        });

        tombolCetak.disabled = false;
    } catch (error) {
        judulLaporan.textContent = '';
        tabelBody.innerHTML = `<tr><td colspan="8" class="text-danger">Error: ${error.message}</td></tr>`;
    }
}

function exportLaporanExcel() {
    if (!window.dataPresensi || !window.daftarGuru) {
        alert("Silakan tampilkan laporan terlebih dahulu sebelum mengekspor!");
        return;
    }

    const dataPresensi = window.dataPresensi;
    const daftarGuru = window.daftarGuru;
    const bulan = document.getElementById('filter-bulan').options[document.getElementById('filter-bulan').selectedIndex].text.toUpperCase();
    const tahun = document.getElementById('filter-tahun').value;

    const judul = ["Rekapitulasi Kehadiran Guru dan Staff", `Tahun Pelajaran ${tahun}-${parseInt(tahun)+1}`];
    const headerKolom = ["No", "Nama Lengkap", "NIP/NIPPPK", ...Array.from({length: 31}, (_, i) => i + 1), "Hadir", "Sakit", "Izin", "Alpa", "Jumlah"];
    const headerGrup = ["", "", "", bulan, ...Array(30).fill(""), "Jumlah Kehadiran"];

    const dataBody = daftarGuru.map((guru, index) => {
        const rekap = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
        const barisTanggal = Array(31).fill("");
        
        dataPresensi.filter(p => p.id_guru === guru.id_guru).forEach(p => {
            const tanggal = new Date(p.tanggal).getDate() - 1;
            // Diperbarui juga di sini untuk konsistensi, meskipun logika Excel mungkin sudah benar
            if (p.status === 'Hadir' || p.status === 'Terlambat') { barisTanggal[tanggal] = '✔'; rekap.Hadir++; }
            else if (p.status === 'Sakit') { barisTanggal[tanggal] = 'S'; rekap.Sakit++; }
            else if (p.status === 'Izin') { barisTanggal[tanggal] = 'I'; rekap.Izin++; }
            else if (p.status === 'Alpa') { barisTanggal[tanggal] = 'A'; rekap.Alpa++; }
        });
        const jumlahTotal = rekap.Hadir + rekap.Sakit + rekap.Izin + rekap.Alpa;
        return [index + 1, guru.nama_lengkap, guru.nip_nipppk, ...barisTanggal, rekap.Hadir, rekap.Sakit, rekap.Izin, rekap.Alpa, jumlahTotal];
    });

    const dataFinal = [[judul[0]], [judul[1]], [], headerGrup, headerKolom, ...dataBody];
    const ws = XLSX.utils.aoa_to_sheet(dataFinal);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 38 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 38 } }, { s: { r: 3, c: 3 }, e: { r: 3, c: 33 } }, { s: { r: 3, c: 34 }, e: { r: 3, c: 38 } }];
    ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 22 }, ...Array(31).fill({ wch: 3 }), { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 7 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${bulan}`);
    XLSX.writeFile(wb, `Laporan_Kehadiran_${bulan}_${tahun}.xlsx`);
}

async function buatDanTampilkanAkunAwal() {
    // ... (Tidak ada perubahan di fungsi ini)
    const getGuruDataBtn = document.getElementById('getGuruDataBtn');
    const hasilDataGuruDiv = document.getElementById('hasilDataGuru');
    const dataOutputPre = document.getElementById('dataOutput');
    const errorMessageDiv = document.getElementById('errorMessage');
    const token = localStorage.getItem('token');
    
    if (!token) {
        errorMessageDiv.textContent = 'Akses ditolak. Silakan login ulang sebagai Admin.';
        errorMessageDiv.className = 'mt-4 alert alert-danger';
        return;
    }
    
    getGuruDataBtn.disabled = true;
    getGuruDataBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Memuat...';
    hasilDataGuruDiv.className = 'mt-4 d-none';
    errorMessageDiv.className = 'mt-4 alert alert-danger d-none';

    try {
        const response = await fetch('/api/laporan/akun-awal-guru', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Gagal mengambil data.' }));
            throw new Error(errorData.message);
        }
        const credentials = await response.json();

        if (credentials.length === 0) {
            dataOutputPre.textContent = 'Tidak ada data guru yang ditemukan untuk di-reset.';
        } else {
            let formattedText = 'Daftar Kredensial Awal Guru (Siap untuk di-copy):\n\n';
            credentials.forEach(guru => {
                formattedText += `Nama    : ${guru.nama_lengkap}\n`;
                formattedText += `Email   : ${guru.email}\n`;
                formattedText += `Password: ${guru.password_awal}\n`;
                formattedText += `-------------------------------------------------\n`;
            });
            dataOutputPre.textContent = formattedText;
        }
        hasilDataGuruDiv.className = 'mt-4';
    } catch (error) {
        errorMessageDiv.textContent = `Gagal memuat data: ${error.message}`;
        errorMessageDiv.className = 'mt-4 alert alert-danger';
    } finally {
        getGuruDataBtn.disabled = false;
        getGuruDataBtn.innerHTML = '<i class="bi bi-shield-lock-fill me-2"></i>Buat & Tampilkan Kredensial Awal';
    }
}