// File: /public/app-guru.js (VERSI PERBAIKAN & INTEGRASI FOTO RESOLUSI RENDAH)

document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // BAGIAN 1: DEKLARASI VARIABEL & REFERENSI ELEMEN
    // =================================================================
    const token = localStorage.getItem('token');

    const namaGuruElem = document.getElementById('nama-guru');
    const nipGuruElem = document.getElementById('nip-guru');

    const viewPresensi = document.getElementById('kartu-presensi');
    const viewRiwayat = document.getElementById('view-riwayat');
    const viewIzin = document.getElementById('view-izin');
    
    const tabHome = document.getElementById('tab-home');
    const tabRiwayat = document.getElementById('tab-riwayat');
    const tabIzin = document.getElementById('tab-izin');
    const tabProfil = document.getElementById('tab-profil');
    const tabLogout = document.getElementById('tombol-logout-guru');

    const waktuSekarangElem = document.getElementById('waktu-sekarang');
    const statusPresensiElem = document.getElementById('status-presensi');
    const tombolPresensi = document.getElementById('tombol-presensi');
    const teksTombolPresensi = document.getElementById('teks-tombol-presensi');
    let statusSaatIni = null;

    const filterBulanRiwayat = document.getElementById('filter-bulan-riwayat');
    const filterTahunRiwayat = document.getElementById('filter-tahun-riwayat');
    const riwayatList = document.getElementById('riwayat-presensi-list');

    const formIzin = document.getElementById('form-izin');

    const cameraModal = new bootstrap.Modal(document.getElementById('cameraModal'));
    const videoElem = document.getElementById('camera-preview');
    const canvasElem = document.getElementById('camera-canvas');
    const tombolAmbilFoto = document.getElementById('tombol-ambil-foto');
    let stream;
    
    // --- VARIABEL UNTUK RESOLUSI RENDAH DARI ambil-foto.html ---
    const TARGET_WIDTH = 320; // Lebar akhir yang lebih kecil (Contoh: 320px)
    const TARGET_HEIGHT = 240; // Tinggi akhir yang lebih kecil (Contoh: 240px)
    const JPEG_QUALITY = 0.6; // Kualitas kompresi JPEG (0.0 hingga 1.0)
    // -------------------------------------------------------------

    // =================================================================
    // BAGIAN 2: FUNGSI UTAMA & INISIALISASI
    // =================================================================
    
    async function init() {
        if (!token) {
            window.location.href = 'login-guru.html';
            return;
        }
        
        setupEventListeners();
        isiFilterRiwayat();
        
        setInterval(() => {
            waktuSekarangElem.textContent = new Date().toLocaleTimeString('en-GB');
        }, 1000);

        await muatDataStatusAwal();

        const hash = window.location.hash;
        if (hash === '#riwayat') {
            tampilkanView('riwayat');
        } else if (hash === '#izin') {
            tampilkanView('izin');
        } else {
            tampilkanView('home');
        }
    }

    async function muatDataStatusAwal() {
        try {
            const response = await fetch('/api/guru/status', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!response.ok) throw new Error('Gagal memuat data pengguna.');
            
            const data = await response.json();
            
            namaGuruElem.textContent = data.profil.nama_lengkap;
            nipGuruElem.textContent = data.profil.nip_nipppk;
          
            updateUIBerdasarkanStatus(data.status_presensi);

        } catch (error) {
            console.error(error);
            alert(error.message);
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login-guru.html';
            }
        }
    }
    
    // =================================================================
    // BAGIAN 3: PENGATUR TAMPILAN (VIEW)
    // =================================================================
    function tampilkanView(namaView) {
        [viewPresensi, viewRiwayat, viewIzin].forEach(v => v.classList.add('d-none'));
        [tabHome, tabRiwayat, tabIzin, tabProfil].forEach(t => t.classList.remove('active'));

        if (namaView === 'home') {
            viewPresensi.classList.remove('d-none');
            tabHome.classList.add('active');
        } else if (namaView === 'riwayat') {
            viewRiwayat.classList.remove('d-none');
            tabRiwayat.classList.add('active');
            muatDataRiwayat();
        } else if (namaView === 'izin') {
            viewIzin.classList.remove('d-none');
            tabIzin.classList.add('active');
        }
    }

    // =================================================================
    // BAGIAN 4: EVENT LISTENERS (Pusat Kendali Aplikasi)
    // =================================================================
    function setupEventListeners() {
        tabHome.addEventListener('click', (e) => { e.preventDefault(); 
            tampilkanView('home'); 
        });
        tabRiwayat.addEventListener('click', (e) => { e.preventDefault(); 
            tampilkanView('riwayat'); 
        });
        tabIzin.addEventListener('click', (e) => { e.preventDefault(); 
            tampilkanView('izin'); 
        });
        tabProfil.addEventListener('click', (e) => { e.preventDefault(); 
            window.location.href = 'profil-guru.html';
        });

        tabLogout.addEventListener('click', () => {
            if (confirm('Apakah Anda yakin ingin keluar?')) {
                localStorage.removeItem('token');
                window.location.href = 'index.html';
            }
        });

        tombolPresensi.addEventListener('click', handleTombolPresensi);
        tombolAmbilFoto.addEventListener('click', handleAmbilFoto);
        formIzin.addEventListener('submit', kirimFormIzin);
        filterBulanRiwayat.addEventListener('change', muatDataRiwayat);
        filterTahunRiwayat.addEventListener('change', muatDataRiwayat);
    }
    
    // =================================================================
    // BAGIAN 5: FUNGSI-FUNGSI LOGIKA
    // =================================================================
    
    function updateUIBerdasarkanStatus(status) {
        statusSaatIni = status.kondisi;
        tombolPresensi.disabled = false;
        switch (status.kondisi) {
            case 'BELUM_MASUK': 
                statusPresensiElem.textContent = "Anda belum melakukan presensi masuk hari ini."; 
                teksTombolPresensi.textContent = "Presensi Masuk"; 
                tombolPresensi.className = 'btn btn-primary btn-lg w-100'; 
                break;
            case 'SUDAH_MASUK':
                statusPresensiElem.textContent = `Anda sudah presensi masuk pada jam ${(status.jam_masuk)}`; 
                teksTombolPresensi.textContent = "Presensi Pulang";
                tombolPresensi.className = 'btn btn-success btn-lg w-100';
                break;
            case 'SUDAH_PULANG':
                statusPresensiElem.textContent = `Anda sudah presensi pulang pada jam ${(status.jam_pulang)}`;
                teksTombolPresensi.textContent = "Selesai";
                tombolPresensi.className = 'btn btn-secondary btn-lg w-100';
                tombolPresensi.disabled = true;
                break;        
        }
    }

    async function handleTombolPresensi() {
        if (!statusSaatIni || statusSaatIni === 'SUDAH_PULANG') return;
        try {
            // Meminta akses kamera
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoElem.srcObject = stream;
            cameraModal.show();
        } catch (error) {
            console.error("Error mengakses kamera:", error);
            alert("Gagal mengakses kamera. Pastikan Anda memberikan izin.");
        }
    }
    
    async function handleAmbilFoto() {
        // --- START: MODIFIKASI UNTUK FOTO RESOLUSI RENDAH ---
        // 1. Tentukan ukuran canvas target (Resolusi Rendah)
        canvasElem.width = TARGET_WIDTH;
        canvasElem.height = TARGET_HEIGHT;
        const ctx = canvasElem.getContext('2d');
        
        // 2. Gambar frame video saat ini ke canvas (Resizing otomatis)
        ctx.drawImage(videoElem, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        
        // 3. Ekstrak data Base64 dengan kompresi rendah (JPEG_QUALITY)
        const foto_base64 = canvasElem.toDataURL('image/jpeg', JPEG_QUALITY);
        // --- END: MODIFIKASI UNTUK FOTO RESOLUSI RENDAH ---

        if (stream) { stream.getTracks().forEach(track => track.stop()); }
        cameraModal.hide();

        statusPresensiElem.textContent = 'Mengambil lokasi GPS...';
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
            });

            const dataPresensi = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };

            let endpoint = '';
            if (statusSaatIni === 'BELUM_MASUK') {
                endpoint = '/api/presensi/masuk';
                dataPresensi.foto_masuk = foto_base64; // Menggunakan foto resolusi rendah
            } else {
                endpoint = '/api/presensi/pulang';
                dataPresensi.foto_pulang = foto_base64; // Menggunakan foto resolusi rendah
            }
            
            tombolPresensi.disabled = true;
            teksTombolPresensi.textContent = 'Mengirim...';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify(dataPresensi)
            });
            const hasil = await response.json();
            if (!response.ok) throw new Error(hasil.message);
            
            alert(hasil.message);
            await muatDataStatusAwal();
            tampilkanView('home');

        } catch (error) {
            console.error('Error Presensi:', error);
            alert(error.message);
            await muatDataStatusAwal();
        }
    }

    function isiFilterRiwayat() {
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const tgl = new Date(), bulan = tgl.getMonth(), tahun = tgl.getFullYear();
        namaBulan.forEach((n, i) => filterBulanRiwayat.add(new Option(n, i + 1)));
        filterBulanRiwayat.value = bulan + 1;
        for (let i = 0; i < 3; i++) { filterTahunRiwayat.add(new Option(tahun - i, tahun - i)); }
    }

    async function muatDataRiwayat() {
        riwayatList.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Memuat riwayat...</td></tr>';
        try {
            const bulan = filterBulanRiwayat.value;
            const tahun = filterTahunRiwayat.value;
            const response = await fetch(`/api/presensi/riwayat?bulan=${bulan}&tahun=${tahun}`, { headers: { 'Authorization': 'Bearer ' + token } });
            if (!response.ok) throw new Error('Gagal memuat riwayat presensi.');
            const daftarRiwayat = await response.json();
            riwayatList.innerHTML = '';
            
            // [DIPERBAIKI] Kesalahan pengetikan '<strong>0</strong>' diubah menjadi angka 0
            if (daftarRiwayat.length === 0) {
                riwayatList.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Tidak ada data presensi untuk periode ini.</td></tr>';
                return;
            }

            daftarRiwayat.forEach(item => {
                const tanggal = new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
                riwayatList.innerHTML += `
                    <tr>
                        <td>${tanggal}</td>
                        <td><span class="badge bg-primary">${(item.jam_masuk)}</span></td>
                        <td><span class="badge bg-success">${(item.jam_pulang)}</span></td>
                        <td>${item.status}</td>
                    </tr>
                `;
            });
        } catch(error) {
            riwayatList.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    async function kirimFormIzin(event) {
        event.preventDefault();
        const dataIzin = {
            jenis_izin: document.getElementById('jenis-izin').value,
            tanggal_mulai: document.getElementById('tanggal-mulai').value,
            tanggal_selesai: document.getElementById('tanggal-selesai').value,
            keterangan: document.getElementById('keterangan').value
        };
        try {
            const response = await fetch('/api/izin', {
                method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(dataIzin)
            });
            const hasil = await response.json();
            if (!response.ok) throw new Error(hasil.message);
            alert(hasil.message);
            formIzin.reset(); // [DIPERBAIKI] Menggunakan formIzin.reset()
            tampilkanView('home');
        } catch(error) {
            alert(`Error: ${error.message}`);
        }
    }
    function formatWaktuLokal(waktuUTC) {
    if (!waktuUTC) return '-';
    const tanggal = new Date(`1970-01-01T${waktuUTC}Z`);
    // Waktu zona waktu Asia/Jakarta (GMT+7) format 24 jam
    return tanggal.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
    });
    };
    init();
});