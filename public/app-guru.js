// File: /public/app-guru.js 

document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // BAGIAN 1: DEKLARASI VARIABEL & REFERENSI ELEMEN
    // =================================================================
    const token = localStorage.getItem('guru_token');

    // Elemen Profil Utama
    const namaGuruElem = document.getElementById('nama-guru');
    const nipGuruElem = document.getElementById('nip-guru');

    // Referensi View (Kontainer Konten)
    const viewPresensi = document.getElementById('kartu-presensi');
    const viewRiwayat = document.getElementById('view-riwayat');
    const viewIzin = document.getElementById('view-izin');
    const viewProfil = document.getElementById('view-profil');
    
    // Referensi Tombol Navigasi
    const tabHome = document.getElementById('tab-home');
    const tabRiwayat = document.getElementById('tab-riwayat');
    const tabIzin = document.getElementById('tab-izin');
    const tabProfil = document.getElementById('tab-profil');
    const tabLogout = document.getElementById('tombol-logout-guru');

    // Referensi Elemen Presensi
    const waktuSekarangElem = document.getElementById('waktu-sekarang');
    const statusPresensiElem = document.getElementById('status-presensi');
    const tombolPresensi = document.getElementById('tombol-presensi');
    const teksTombolPresensi = document.getElementById('teks-tombol-presensi');
    let statusSaatIni = null;

    // Referensi Elemen Riwayat
    const filterBulanRiwayat = document.getElementById('filter-bulan-riwayat');
    const filterTahunRiwayat = document.getElementById('filter-tahun-riwayat');
    const riwayatList = document.getElementById('riwayat-presensi-list');

    // Referensi Elemen Izin & Profil
    const formIzin = document.getElementById('form-izin');
    const formUbahPassword = document.getElementById('form-ubah-password');

    const cameraModal = new bootstrap.Modal(document.getElementById('cameraModal'));
    const videoElem = document.getElementById('camera-preview');
    const canvasElem = document.getElementById('camera-canvas');
    const tombolAmbilFoto = document.getElementById('tombol-ambil-foto');
    let stream;

    // =================================================================
    // BAGIAN 2: FUNGSI UTAMA & INISIALISASI
    // =================================================================
    
    // Fungsi yang berjalan pertama kali
    async function init() {
        if (!token) {
            window.location.href = 'login-guru.html';
            return;
        }
        
        setupEventListeners(); // Daftarkan semua event listener di sini
        isiFilterRiwayat(); // Isi filter bulan dan tahun untuk riwayat
        
        // Update jam secara real-time
        setInterval(() => {
            waktuSekarangElem.textContent = new Date().toLocaleTimeString('en-GB');
        }, 1000);

        // Muat data awal untuk halaman Home
        muatDataStatusAwal();
    }

    // Fungsi untuk mengambil status awal (profil & presensi)
    async function muatDataStatusAwal() {
        try {
            const response = await fetch('/api/guru/status', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!response.ok) throw new Error('Gagal memuat data pengguna.');
            
            const data = await response.json();
            
            // Update UI Profil di header dan di halaman profil
            namaGuruElem.textContent = data.profil.nama_lengkap;
            nipGuruElem.textContent = data.profil.nip_nipppk;
            document.getElementById('profil-nama').textContent = data.profil.nama_lengkap;
            document.getElementById('profil-nip').textContent = data.profil.nip_nipppk;
            document.getElementById('profil-email').textContent = data.profil.email;
            
            // Update UI kartu presensi
            updateUIBerdasarkanStatus(data.status_presensi);

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    // =================================================================
    // BAGIAN 3: PENGELOLA TAMPILAN (VIEW MANAGER)
    // =================================================================
    function tampilkanView(namaView) {
        // Sembunyikan semua
        [viewPresensi, viewRiwayat, viewIzin, viewProfil].forEach(v => v.classList.add('d-none'));
        [tabHome, tabRiwayat, tabIzin, tabProfil].forEach(t => t.classList.remove('active'));

        // Tampilkan yang dipilih
        if (namaView === 'home') {
            viewPresensi.classList.remove('d-none');
            tabHome.classList.add('active');
        } else if (namaView === 'riwayat') {
            viewRiwayat.classList.remove('d-none');
            tabRiwayat.classList.add('active');
            muatDataRiwayat(); // Muat data hanya saat view ini ditampilkan
        } else if (namaView === 'izin') {
            viewIzin.classList.remove('d-none');
            tabIzin.classList.add('active');
        } else if (namaView === 'profil') {
            viewProfil.classList.remove('d-none');
            tabProfil.classList.add('active');
        }
    }

    // =================================================================
    // BAGIAN 4: EVENT LISTENERS (Pusat Kendali Aplikasi)
    // =================================================================
    function setupEventListeners() {
        // Navigasi
        tabHome.addEventListener('click', () => tampilkanView('home'));
        tabRiwayat.addEventListener('click', () => tampilkanView('riwayat'));
        tabIzin.addEventListener('click', () => tampilkanView('izin'));
        tabProfil.addEventListener('click', () => tampilkanView('profil'));
        tabLogout.addEventListener('click', () => {
            localStorage.removeItem('guru_token');
            window.location.href = 'index.html';
        });

        // Aksi
        tombolPresensi.addEventListener('click', lakukanPresensi);
        formIzin.addEventListener('submit', kirimFormIzin);
        formUbahPassword.addEventListener('submit', kirimFormUbahPassword);
        filterBulanRiwayat.addEventListener('change', muatDataRiwayat);
        filterTahunRiwayat.addEventListener('change', muatDataRiwayat);
    }
    
    // =================================================================
    // BAGIAN 5: FUNGSI-FUNGSI LOGIKA 
    // =================================================================
    
    // Fungsi untuk Presensi
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
            statusPresensiElem.textContent = `Anda sudah presensi masuk pada jam ${formatWaktuLokal(status.jam_masuk)}`; 
            teksTombolPresensi.textContent = "Presensi Pulang";

            break;
        case 'SUDAH_PULANG':
            statusPresensiElem.textContent = `Anda sudah presensi pulang pada jam ${formatWaktuLokal(status.jam_pulang)}`;
            teksTombolPresensi.textContent = "Selesai";
            break;        
            }
        }

    async function lakukanPresensi() {
        if (!statusSaatIni || statusSaatIni === 'SUDAH_PULANG') return;

        try {
            // 1. Minta akses dan nyalakan kamera
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoElem.srcObject = stream;
            cameraModal.show(); // Tampilkan modal kamera
        } catch (error) {
            console.error("Error mengakses kamera:", error);
            alert("Gagal mengakses kamera. Pastikan Anda memberikan izin.");
        }
    }
        // Fungsi untuk Riwayat
    function isiFilterRiwayat() {
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const tanggalSekarang = new Date();
        const bulanSekarang = tanggalSekarang.getMonth();
        const tahunSekarang = tanggalSekarang.getFullYear();
        namaBulan.forEach((nama, index) => { filterBulanRiwayat.add(new Option(nama, index + 1)); });
        filterBulanRiwayat.value = bulanSekarang + 1;
        for (let i = 0; i < 3; i++) { filterTahunRiwayat.add(new Option(tahunSekarang - i, tahunSekarang - i)); }
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
            if (daftarRiwayat.length === 0) {
                riwayatList.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Tidak ada data presensi untuk periode ini.</td></tr>';
                return;
            }
            daftarRiwayat.forEach(item => {
                const tanggal = new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
                riwayatList.innerHTML += `
                    <tr>
                        <td>${tanggal}</td>
                        <td><span class="badge bg-primary">${formatWaktuLokal(item.jam_masuk)}</span></td> <td><span class="badge bg-success">${formatWaktuLokal(item.jam_pulang)}</span></td> <td>${item.status}</td>
                    </tr>
                `;
            });
        } catch(error) {
            riwayatList.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    // Fungsi untuk Izin
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
            this.reset();
            tampilkanView('home');
        } catch(error) {
            alert(`Error: ${error.message}`);
        }
    }

    // Fungsi untuk Ubah Password
    async function kirimFormUbahPassword(event) {
        event.preventDefault();
        const dataPassword = {
            password_lama: document.getElementById('password-lama').value,
            password_baru: document.getElementById('password-baru').value,
            konfirmasi_password_baru: document.getElementById('konfirmasi-password-baru').value
        };
        try {
            const response = await fetch('/api/guru/profile/password', {
                method: 'PUT', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(dataPassword)
            });
            const hasil = await response.json();
            if (!response.ok) throw new Error(hasil.message);
            alert(hasil.message);
            this.reset();
        } catch(error) {
            alert(`Error: ${error.message}`);
        }
    }
      // EVENT LISTENER BARU UNTUK TOMBOL PENGAMBIL FOTO
    tombolAmbilFoto.addEventListener('click', async () => {
        // 2. Ambil gambar dari video
        canvasElem.width = videoElem.videoWidth;
        canvasElem.height = videoElem.videoHeight;
        canvasElem.getContext('2d').drawImage(videoElem, 0, 0, videoElem.videoWidth, videoElem.videoHeight);
        const foto_base64 = canvasElem.toDataURL('image/jpeg');

        // Matikan kamera
        stream.getTracks().forEach(track => track.stop());
        cameraModal.hide();

        // 3. Ambil lokasi GPS
        statusPresensiElem.textContent = 'Mengambil lokasi GPS...';
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
            });

            const dataPresensi = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };

            // 4. Kirim data ke server (sama seperti sebelumnya)
            let endpoint = '';
            if (statusSaatIni === 'BELUM_MASUK') {
                endpoint = '/api/presensi/masuk';
                dataPresensi.foto_masuk = foto_base64;
            } else { // SUDAH_MASUK
                endpoint = '/api/presensi/pulang';
                dataPresensi.foto_pulang = foto_base64;
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
            init(); // Muat ulang status

        } catch (error) {
            console.error('Error Presensi:', error);
            alert(error.message);
            tombolPresensi.disabled = false;
            init(); // Muat ulang status
        }
    });
    // =================================================================
    // FUNGSI UBAH FORMAT WAKTU
    // =================================================================
    function formatWaktuLokal(waktuUTC) {
        if (!waktuUTC) return '-'; 

        const tanggalUTC = new Date(`1970-01-01T${waktuUTC}Z`);

        return tanggalUTC.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
 
    init();
});