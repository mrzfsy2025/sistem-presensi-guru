// File: /public/script-laporan.js (SUDAH DIPERBAIKI)

document.addEventListener('DOMContentLoaded', function() {
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const tombolTampilkan = document.getElementById('tombol-tampilkan');
    const tombolCetak = document.getElementById('tombol-cetak');
    const tombolExport = document.getElementById('exportExcelBtn');
    const getGuruDataBtn = document.getElementById('getGuruDataBtn');

    if (filterBulan && filterTahun) {
        isiFilter(filterBulan, filterTahun);
    }
    
    if (tombolTampilkan) tombolTampilkan.addEventListener('click', tampilkanLaporan);
    if (tombolCetak) tombolCetak.addEventListener('click', () => window.print());
    if (tombolExport) tombolExport.addEventListener('click', exportLaporanExcel);
    if (getGuruDataBtn) getGuruDataBtn.addEventListener('click', buatDanTampilkanAkunAwal);
});

// =================================================================
// BAGIAN FUNGSI-FUNGSI LOGIKA
// =================================================================

async function exportLaporanExcel() {
    const tombolExport = document.getElementById('exportExcelBtn');
    const bulanValue = document.getElementById('filter-bulan').value;
    const bulanTeks = document.getElementById('filter-bulan').options[document.getElementById('filter-bulan').selectedIndex].text.toUpperCase();
    const tahun = document.getElementById('filter-tahun').value;
    const token = localStorage.getItem('token');

    tombolExport.disabled = true;
    tombolExport.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengekspor...`;

    try {
        const response = await fetch(`/api/laporan/harian-detail?bulan=${bulanValue}&tahun=${tahun}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Gagal mengambil data detail.' }));
            throw new Error(errorData.message);
        }

        // Ambil SEMUA data yang sudah dipaketkan oleh server
        const dataFromServer = await response.json();
        
        // Gunakan nama variabel yang jelas dari dataFromServer
        const daftarGuruUtama = dataFromServer.daftarGuru;
        const dataPresensiHarian = dataFromServer.dataPresensi;
        const rekapitulasiAkurat = dataFromServer.dataRekapFinal;
        
        if (!daftarGuruUtama || daftarGuruUtama.length === 0) {
            alert("Tidak ada data guru untuk diekspor pada periode ini.");
            return;
        }

        const judul = ["Rekapitulasi Kehadiran Guru dan Staff", `Tahun Pelajaran ${tahun}-${parseInt(tahun)+1}`];
        const headerKolom = ["No", "Nama Lengkap", "NIP/NIPPPK", ...Array.from({length: 31}, (_, i) => i + 1), "Hadir", "Sakit", "Izin", "Alpa", "Jumlah"];
        const headerGrup = ["", "", "", bulanTeks, ...Array(30).fill(""), "Jumlah Kehadiran"];

        const dataBody = daftarGuruUtama.map((guru, index) => {
            // Langkah 1: Siapkan grid harian
            const barisTanggal = Array(31).fill("");
            dataPresensiHarian.filter(p => p.id_guru == guru.id_guru).forEach(p => {
                const tanggal = new Date(p.tanggal).getDate() - 1;
                const statusBersih = p.status.trim().toLowerCase();

                if (statusBersih === 'hadir' || statusBersih === 'terlambat') { barisTanggal[tanggal] = '✔'; }
                else if (statusBersih === 'sakit') { barisTanggal[tanggal] = 'S'; }
                else if (statusBersih === 'izin') { barisTanggal[tanggal] = 'I'; }
                else if (statusBersih === 'alpa') { barisTanggal[tanggal] = 'A'; }
            });

            // Langkah 2: Ambil rekap yang sudah akurat dari server
            const rekapGuruIni = rekapitulasiAkurat.find(r => r.id_guru == guru.id_guru);
            
            const hadir = rekapGuruIni ? parseInt(rekapGuruIni.hadir) : 0;
            const sakit = rekapGuruIni ? parseInt(rekapGuruIni.sakit) : 0;
            const izin = rekapGuruIni ? parseInt(rekapGuruIni.izin) : 0;
            const alpa = rekapGuruIni ? parseInt(rekapGuruIni.alpa) : 0;
            const jumlahTotal = hadir + sakit + izin + alpa;

            // Langkah 3: Gabungkan grid harian dengan rekap akurat
            return [index + 1, guru.nama_lengkap, guru.nip_nipppk, ...barisTanggal, hadir, sakit, izin, alpa, jumlahTotal];
        });

        const dataFinal = [[judul[0]], [judul[1]], [], headerGrup, headerKolom, ...dataBody];
        const ws = XLSX.utils.aoa_to_sheet(dataFinal);
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 38 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 38 } }, { s: { r: 3, c: 3 }, e: { r: 3, c: 33 } }, { s: { r: 3, c: 34 }, e: { r: 3, c: 38 } }];
        ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 22 }, ...Array(31).fill({ wch: 3 }), { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 7 }];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Laporan ${bulanTeks}`);
        XLSX.writeFile(wb, `Laporan_Kehadiran_${bulanTeks}_${tahun}.xlsx`);

    } catch (error) {
        console.error("Gagal mengekspor data:", error);
        alert("Terjadi kesalahan saat mengekspor data: " + error.message);
    } finally {
        tombolExport.disabled = false;
        tombolExport.innerHTML = '<i class="bi bi-file-earmark-excel-fill me-2"></i>Export ke Excel';
    }
}

// =================================================================
// FUNGSI EKSPOR EXCEL YANG SUDAH DIPERBAIKI TOTAL
// =================================================================
async function exportLaporanExcel() {
    const tombolExport = document.getElementById('exportExcelBtn');
    const bulanValue = document.getElementById('filter-bulan').value;
    const bulanTeks = document.getElementById('filter-bulan').options[document.getElementById('filter-bulan').selectedIndex].text.toUpperCase();
    const tahun = document.getElementById('filter-tahun').value;
    const token = localStorage.getItem('token');

    tombolExport.disabled = true;
    tombolExport.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengekspor...`;

    try {
        const response = await fetch(`/api/laporan/harian-detail?bulan=${bulanValue}&tahun=${tahun}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Gagal mengambil data detail.' }));
            throw new Error(errorData.message);
        }

        // Ambil SEMUA data yang sudah dipaketkan oleh server
        const { daftarGuru, dataPresensi, dataRekapFinal } = await response.json();
        
        if (!daftarGuru || daftarGuru.length === 0) {
            alert("Tidak ada data guru untuk diekspor pada periode ini.");
            return;
        }

        const judul = ["Rekapitulasi Kehadiran Guru dan Staff", `Tahun Pelajaran ${tahun}-${parseInt(tahun)+1}`];
        const headerKolom = ["No", "Nama Lengkap", "NIP/NIPPPK", ...Array.from({length: 31}, (_, i) => i + 1), "Hadir", "Sakit", "Izin", "Alpa", "Jumlah"];
        const headerGrup = ["", "", "", bulanTeks, ...Array(30).fill(""), "Jumlah Kehadiran"];

        const dataBody = daftarGuru.map((guru, index) => {
            // Langkah 1: Siapkan grid harian (bagian ini tetap sama)
            const barisTanggal = Array(31).fill("");
            dataPresensi.filter(p => p.id_guru == guru.id_guru).forEach(p => {
                const tanggal = new Date(p.tanggal).getDate() - 1;
                const statusBersih = p.status.trim().toLowerCase();

                if (statusBersih === 'hadir' || statusBersih === 'terlambat') { barisTanggal[tanggal] = '✔'; }
                else if (statusBersih === 'sakit') { barisTanggal[tanggal] = 'S'; }
                else if (statusBersih === 'izin') { barisTanggal[tanggal] = 'I'; }
                else if (statusBersih === 'alpa') { barisTanggal[tanggal] = 'A'; }
            });

            // Langkah 2: Ambil rekap yang sudah akurat dari server, JANGAN HITUNG ULANG!
            const rekapAkurat = dataRekapFinal.find(r => r.id_guru == guru.id_guru);
            
            const hadir = rekapAkurat ? parseInt(rekapAkurat.hadir) : 0;
            const sakit = rekapAkurat ? parseInt(rekapAkurat.sakit) : 0;
            const izin = rekapAkurat ? parseInt(rekapAkurat.izin) : 0;
            const alpa = rekapAkurat ? parseInt(rekapAkurat.alpa) : 0;
            const jumlahTotal = (hadir + izin);

            // Langkah 3: Gabungkan grid harian dengan rekap akurat
            return [index + 1, guru.nama_lengkap, guru.nip_nipppk, ...barisTanggal, hadir, sakit, izin, alpa, jumlahTotal];
        });

        const dataFinal = [[judul[0]], [judul[1]], [], headerGrup, headerKolom, ...dataBody];
        const ws = XLSX.utils.aoa_to_sheet(dataFinal);
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 38 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 38 } }, { s: { r: 3, c: 3 }, e: { r: 3, c: 33 } }, { s: { r: 3, c: 34 }, e: { r: 3, c: 38 } }];
        ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 22 }, ...Array(31).fill({ wch: 3 }), { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 7 }];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Laporan ${bulanTeks}`);
        XLSX.writeFile(wb, `Laporan_Kehadiran_${bulanTeks}_${tahun}.xlsx`);

    } catch (error) {
        console.error("Gagal mengekspor data:", error);
        alert("Terjadi kesalahan saat mengekspor data: " + error.message);
    } finally {
        tombolExport.disabled = false;
        tombolExport.innerHTML = '<i class="bi bi-file-earmark-excel-fill me-2"></i>Export ke Excel';
    }
}


async function buatDanTampilkanAkunAwal() {
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