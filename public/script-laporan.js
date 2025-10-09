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
        const headerKolom = ["No", "Nama Lengkap", "NIP/NIPPPK", ...Array.from({length: 31}, (_, i) => i + 1), "Hadir", "Sakit", "Izin", "Alpa", "Jumlah Hadir"];
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
            const jumlahTotal = hadir + izin;

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