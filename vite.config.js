// File: /ABSENSI/vite.config.js
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '../public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/dashboard_utama.html'),
        login: resolve(__dirname, 'src/login.html'),
        login_guru: resolve(__dirname, 'src/login-guru.html'),
        app_guru: resolve(__dirname, 'src/app-guru.html'),
        manajemen_guru: resolve(__dirname, 'src/manajemen-guru.html'),
        manajemen_izin: resolve(__dirname, 'src/manajemen-izin.html'),
        laporan: resolve(__dirname, 'src/laporan.html'),
        koreksi_presensi: resolve(__dirname, 'src/koreksi-presensi.html'),
        pengaturan: resolve(__dirname, 'src/pengaturan.html'),
      },
    },
  },

root: 'src',
});
