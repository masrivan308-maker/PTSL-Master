import * as XLSX from 'xlsx';
import { PTSLData } from './types';
import { MASTER_WARGA_DATA } from './data/masterWarga';
import localforage from 'localforage';

localforage.config({
  name: 'PTSL_DB',
  storeName: 'ptsl_references'
});

const STORAGE_KEY = 'ptsl_database';
const REF_WARGA_KEY = 'ref_warga';
const REF_SPPT_KEY = 'ref_sppt';
const USERS_KEY = 'ptsl_users';

export const dbService = {
  // User Management
  getUsers: (): any[] => {
    let data = localStorage.getItem(USERS_KEY);
    let users = data ? JSON.parse(data) : [];
    
    // Seed default admin if no users exist or admin doesn't exist
    if (!users.find((u: any) => u.username === 'admin')) {
      users.push({ username: 'admin', password: 'password123', role: 'admin' });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    // Backfill roles for older users
    return users.map((u: any) => ({ ...u, role: u.role || 'operator' }));
  },

  registerUser: (username: string, password: string, role: string = 'operator') => {
    const users = dbService.getUsers();
    if (users.find(u => u.username === username)) {
      throw new Error('Username sudah digunakan');
    }
    users.push({ username, password, role });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  updateUser: (oldUsername: string, updatedData: any) => {
    const users = dbService.getUsers();
    const index = users.findIndex(u => u.username === oldUsername);
    if (index === -1) throw new Error('User tidak ditemukan');
    
    // check if changing to an existing username
    if (updatedData.username !== oldUsername && users.find(u => u.username === updatedData.username)) {
      throw new Error('Username sudah digunakan');
    }

    users[index] = { ...users[index], ...updatedData };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  deleteUser: (username: string) => {
    let users = dbService.getUsers();
    users = users.filter(u => u.username !== username);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  authenticate: (username: string, password: string) => {
    const users = dbService.getUsers();
    return users.find(u => u.username === username && u.password === password);
  },

  clearAllRows: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Google Sheets Sync
  syncWithGoogleSheet: async (input: string): Promise<any[]> => {
    // Extract ID if full URL is provided
    let sheetId = input.trim();
    if (input.includes('/d/')) {
      if (input.includes('/d/e/')) {
         const match = input.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
         if (match && match[1]) {
            throw new Error('Link yang Anda masukkan adalah link "Publish to web" (/d/e/...). Silakan gunakan link dari tombol "Share" yang biasa (yang berisi /d/ dan bukan /d/e/).');
         }
      } else {
         const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
         if (match && match[1]) {
           sheetId = match[1];
         }
      }
    }

    try {
      // Format URL using Google Visualization API (supports CORS and 'Anyone with link' sharing)
      let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
      
      let response;
      try {
        response = await fetch(url, { method: 'GET' });
      } catch (fetchError) {
        throw new Error('Gagal mengakses link. Pastikan akses Share Google Sheet disetel "Anyone with the link" (Siapa saja yang memiliki link) tanpa batasan internal/organisasi.');
      }

      if (!response.ok) {
        // Fallback to publish to web URL
        url = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv&gid=0`;
        try {
          response = await fetch(url, { method: 'GET' });
        } catch (fetchErr) {
          throw new Error('Gagal mengakses link. Pastikan akses Share Google Sheet disetel "Anyone with the link".');
        }

        if (!response.ok) {
          throw new Error(`Sheet tidak ditemukan (Kode ${response.status}). Pastikan ID atau Link Spreadsheet valid dan tidak dikunci.`);
        }
      }
      
      const csvData = await response.text();
      // If it returns HTML instead of CSV, it usually means it's restricted/private
      if (csvData.trim().startsWith('<!DOCTYPE html>') || csvData.trim().startsWith('<html')) {
        throw new Error('Akses ditolak. Pastikan akses Sheet disetel ke "Siapa saja yang memiliki link" (Share > Anyone with the link)');
      }

      const workbook = XLSX.read(csvData, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
      
      return data;
    } catch (error: any) {
      console.error('Error syncing with Google Sheets:', error);
      throw new Error(error.message || 'Gagal mengambil data dari Google Sheets. Pastikan ID valid dan akses terbuka.');
    }
  },

  getRows: (): PTSLData[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveRow: (row: PTSLData) => {
    const rows = dbService.getRows();
    const newRow = { 
      ...row, 
      id: row.id || crypto.randomUUID(),
      createdAt: row.createdAt || new Date().toISOString()
    };
    
    if (row.id) {
      const index = rows.findIndex(r => r.id === row.id);
      if (index !== -1) {
        rows[index] = newRow;
      } else {
        rows.push(newRow);
      }
    } else {
      // Check for duplicates by NIB or NIK if it's a new entry
      const existingIndex = rows.findIndex(r => 
        (row.nib && r.nib === row.nib) || (row.noKtp && r.noKtp === row.noKtp)
      );
      
      if (existingIndex !== -1) {
        // If found, update the existing one (Overwrite old with new)
        rows[existingIndex] = { ...newRow, id: rows[existingIndex].id };
      } else {
        rows.push(newRow);
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    return newRow;
  },

  // Reference Database Methods
  saveRefWarga: async (data: any[]) => {
    try {
      // Optimize storage: only keep columns we actually use in the form lookup
      const keysToKeep = ['NIK', 'NAMA', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'ALAMAT', 'RT/RW', 'KEL/DESA', 'KECAMATAN', 'PEKERJAAN', 'NO HP', 'noKtp', 'nama', 'tempatLahir', 'tanggalLahir', 'alamat', 'rtRw', 'kelDesa', 'kecamatan', 'pekerjaan', 'noHp'];
      const optimizedData = data.map(row => {
        const newRow: any = {};
        keysToKeep.forEach(key => {
          if (row[key] !== undefined) newRow[key] = row[key];
        });
        return newRow;
      });
      await localforage.setItem(REF_WARGA_KEY, optimizedData);
      localStorage.removeItem(REF_WARGA_KEY); // Clean up old data from localStorage
    } catch (e: any) {
      throw new Error(e.message || 'Gagal menyimpan data ke IndexedDB');
    }
  },

  getRefWarga: async (): Promise<any[]> => {
    try {
      const localData: any[] | null = await localforage.getItem(REF_WARGA_KEY);
      const parsedLocal = localData || [];
      
      // Map Master Data to the expected lookup format
      const mappedMaster = MASTER_WARGA_DATA.map(v => ({
        NIK: v.NIK,
        NAMA: v.NAMA,
        'TEMPAT LAHIR': v.TEMPAT_LAHIR,
        'TANGGAL LAHIR': v.TANGGAL_LAHIR,
        ALAMAT: v.ALAMAT,
        'RT/RW': v.RT_RW,
        'KEL/DESA': v.KEL_DESA,
        KECAMATAN: v.KECAMATAN,
        PEKERJAAN: v.PEKERJAAN,
        'NO HP': v.NO_HP
      }));

      return [...mappedMaster, ...parsedLocal];
    } catch (e) {
      return [];
    }
  },

  saveRefSppt: async (data: any[]) => {
    try {
      // Optimize storage for SPPT
      const keysToKeep = ['NOP', 'NAMA WAJIB PAJAK', 'LUAS SPPT', 'NJOP PERMETER', 'DUSUN', 'BLOK', 'RT', 'RW', 'DESA', 'KECAMATAN', 'nopSppt', 'namaWajibPajak', 'luasSppt', 'njopPermeter', 'dusunJalanGang', 'desa', 'kecamatanLokasi'];
      const optimizedData = data.map(row => {
        const newRow: any = {};
        keysToKeep.forEach(key => {
          if (row[key] !== undefined) newRow[key] = row[key];
        });
        return newRow;
      });
      await localforage.setItem(REF_SPPT_KEY, optimizedData);
      localStorage.removeItem(REF_SPPT_KEY); // Clean up old data from localStorage
    } catch (e: any) {
      throw new Error(e.message || 'Gagal menyimpan data SPPT ke IndexedDB');
    }
  },

  getRefSppt: async (): Promise<any[]> => {
    try {
      const data: any[] | null = await localforage.getItem(REF_SPPT_KEY);
      return data || [];
    } catch (e) {
      return [];
    }
  },
  
  clearRefData: async (type: 'WARGA' | 'SPPT') => {
    if (type === 'WARGA') {
      await localforage.removeItem(REF_WARGA_KEY);
      localStorage.removeItem(REF_WARGA_KEY);
    } else {
      await localforage.removeItem(REF_SPPT_KEY);
      localStorage.removeItem(REF_SPPT_KEY);
    }
  },
  
  deleteRow: (id: string) => {
    const rows = dbService.getRows();
    const filtered = rows.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },
  
  exportToExcel: (data: PTSLData[]) => {
    // Format headers for readable Excel according to the form
    const EXCEL_MAPPING = [
      { key: 'nib', label: 'NIB' },
      { key: 'luas', label: 'Luas (M2)' },
      { key: 'noKtp', label: 'NIK Pemohon' },
      { key: 'nama', label: 'Nama Pemohon' },
      { key: 'tempatLahir', label: 'Tempat Lahir' },
      { key: 'tanggalLahir', label: 'Tanggal Lahir' },
      { key: 'pekerjaan', label: 'Pekerjaan' },
      { key: 'noHp', label: 'No HP' },
      { key: 'alamat', label: 'Alamat' },
      { key: 'rtRw', label: 'RT/RW' },
      { key: 'kelDesa', label: 'Kel/Desa' },
      { key: 'kecamatan', label: 'Kecamatan' },
      { key: 'nopSppt', label: 'NOP SPPT' },
      { key: 'namaWajibPajak', label: 'Nama WP' },
      { key: 'luasSppt', label: 'Luas SPPT' },
      { key: 'njopPermeter', label: 'NJOP/m2' },
      { key: 'dusunJalanGang', label: 'Dusun/Jalan' },
      { key: 'blok', label: 'Blok' },
      { key: 'rt', label: 'RT' },
      { key: 'rw', label: 'RW' },
      { key: 'desa', label: 'Desa Lokasi' },
      { key: 'kecamatanLokasi', label: 'Kecamatan Lokasi' },
      { key: 'luasDimohon', label: 'Luas Dimohon' },
      { key: 'diperolehMelalui', label: 'Diperoleh Melalui' },
      { key: 'buktiPerolehan', label: 'Bukti Perolehan' },
      { key: 'pemilikKe1Petok', label: 'Pemilik Ke-1' },
      { key: 'pemilikKe2', label: 'Pemilik Ke-2' },
      { key: 'pemilikKe3Pemohon', label: 'Pemilik Ke-3 (Pemohon)' },
      { key: 'tahunDimilikiPihakKe1', label: 'Tahun Milik 1' },
      { key: 'tahunDimilikiPihakKe3', label: 'Tahun Milik 3' },
      { key: 'petokC', label: 'Petok C' },
      { key: 'noPersil', label: 'Persil' },
      { key: 'kelas', label: 'Kelas' },
      { key: 'luas3', label: 'Luas (Riwayat)' },
      { key: 'pertanianNonPertanian', label: 'Jenis Tanah' },
      { key: 'utara', label: 'Batas Utara' },
      { key: 'timur', label: 'Batas Timur' },
      { key: 'selatan', label: 'Batas Selatan' },
      { key: 'barat', label: 'Batas Barat' },
      { key: 'namaSaksi1', label: 'Saksi 1' },
      { key: 'nikSaksi1', label: 'NIK Saksi 1' },
      { key: 'pekerjaanSaksi1', label: 'Pekerjaan Saksi 1' },
      { key: 'alamatSaksi1', label: 'Alamat Saksi 1' },
      { key: 'namaSaksi2', label: 'Saksi 2' },
      { key: 'nikSaksi2', label: 'NIK Saksi 2' },
      { key: 'pekerjaanSaksi2', label: 'Pekerjaan Saksi 2' },
      { key: 'alamatSaksi2', label: 'Alamat Saksi 2' },
      { key: 'namaKades', label: 'Kades' },
      { key: 'noAkteTanah', label: 'No Akte' },
      { key: 'keteranganTanah', label: 'Keterangan' },
      { key: 'operator', label: 'Operator' }
    ];

    const formattedData = data.map(row => {
      const obj: any = {};
      EXCEL_MAPPING.forEach(m => {
        obj[m.label] = (row as any)[m.key] || '';
      });
      obj['Tanggal Input'] = row.createdAt || '';
      return obj;
    });
    
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data PTSL");
    
    // Save file
    XLSX.writeFile(wb, `PTSL_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  },
  
  parsePTSLDataFromExcel: (rows: any[]): PTSLData[] => {
    const EXCEL_MAPPING = [
      { key: 'nib', label: 'NIB' },
      { key: 'luas', label: 'Luas (M2)' },
      { key: 'noKtp', label: 'NIK Pemohon' },
      { key: 'nama', label: 'Nama Pemohon' },
      { key: 'tempatLahir', label: 'Tempat Lahir' },
      { key: 'tanggalLahir', label: 'Tanggal Lahir' },
      { key: 'pekerjaan', label: 'Pekerjaan' },
      { key: 'noHp', label: 'No HP' },
      { key: 'alamat', label: 'Alamat' },
      { key: 'rtRw', label: 'RT/RW' },
      { key: 'kelDesa', label: 'Kel/Desa' },
      { key: 'kecamatan', label: 'Kecamatan' },
      { key: 'nopSppt', label: 'NOP SPPT' },
      { key: 'namaWajibPajak', label: 'Nama WP' },
      { key: 'luasSppt', label: 'Luas SPPT' },
      { key: 'njopPermeter', label: 'NJOP/m2' },
      { key: 'dusunJalanGang', label: 'Dusun/Jalan' },
      { key: 'blok', label: 'Blok' },
      { key: 'rt', label: 'RT' },
      { key: 'rw', label: 'RW' },
      { key: 'desa', label: 'Desa Lokasi' },
      { key: 'kecamatanLokasi', label: 'Kecamatan Lokasi' },
      { key: 'luasDimohon', label: 'Luas Dimohon' },
      { key: 'diperolehMelalui', label: 'Diperoleh Melalui' },
      { key: 'buktiPerolehan', label: 'Bukti Perolehan' },
      { key: 'pemilikKe1Petok', label: 'Pemilik Ke-1' },
      { key: 'pemilikKe2', label: 'Pemilik Ke-2' },
      { key: 'pemilikKe3Pemohon', label: 'Pemilik Ke-3 (Pemohon)' },
      { key: 'tahunDimilikiPihakKe1', label: 'Tahun Milik 1' },
      { key: 'tahunDimilikiPihakKe3', label: 'Tahun Milik 3' },
      { key: 'petokC', label: 'Petok C' },
      { key: 'noPersil', label: 'Persil' },
      { key: 'kelas', label: 'Kelas' },
      { key: 'luas3', label: 'Luas (Riwayat)' },
      { key: 'pertanianNonPertanian', label: 'Jenis Tanah' },
      { key: 'utara', label: 'Batas Utara' },
      { key: 'timur', label: 'Batas Timur' },
      { key: 'selatan', label: 'Batas Selatan' },
      { key: 'barat', label: 'Batas Barat' },
      { key: 'namaSaksi1', label: 'Saksi 1' },
      { key: 'nikSaksi1', label: 'NIK Saksi 1' },
      { key: 'pekerjaanSaksi1', label: 'Pekerjaan Saksi 1' },
      { key: 'alamatSaksi1', label: 'Alamat Saksi 1' },
      { key: 'namaSaksi2', label: 'Saksi 2' },
      { key: 'nikSaksi2', label: 'NIK Saksi 2' },
      { key: 'pekerjaanSaksi2', label: 'Pekerjaan Saksi 2' },
      { key: 'alamatSaksi2', label: 'Alamat Saksi 2' },
      { key: 'namaKades', label: 'Kades' },
      { key: 'noAkteTanah', label: 'No Akte' },
      { key: 'keteranganTanah', label: 'Keterangan' },
      { key: 'operator', label: 'Operator' }
    ];

    return rows.map((row: any) => {
      const newRow: any = {
        id: crypto.randomUUID(),
        createdAt: row['Tanggal Input'] || new Date().toISOString()
      };
      
      // Support both exact keys and human readable labels
      EXCEL_MAPPING.forEach(m => {
        if (row[m.label] !== undefined) {
          newRow[m.key] = String(row[m.label]);
        } else if (row[m.key] !== undefined) {
          newRow[m.key] = String(row[m.key]);
        }
      });
      
      return newRow;
    }) as PTSLData[];
  },

  importFromExcel: async (file: File): Promise<PTSLData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        resolve(dbService.parsePTSLDataFromExcel(rows));
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  },

  downloadTemplate: (type: 'PTSL' | 'WARGA' | 'SPPT') => {
    let headers: string[] = [];
    let filename = '';

    if (type === 'PTSL') {
      const EXCEL_MAPPING = [
        { key: 'nib', label: 'NIB' },
        { key: 'luas', label: 'Luas (M2)' },
        { key: 'noKtp', label: 'NIK Pemohon' },
        { key: 'nama', label: 'Nama Pemohon' },
        { key: 'tempatLahir', label: 'Tempat Lahir' },
        { key: 'tanggalLahir', label: 'Tanggal Lahir' },
        { key: 'pekerjaan', label: 'Pekerjaan' },
        { key: 'noHp', label: 'No HP' },
        { key: 'alamat', label: 'Alamat' },
        { key: 'rtRw', label: 'RT/RW' },
        { key: 'kelDesa', label: 'Kel/Desa' },
        { key: 'kecamatan', label: 'Kecamatan' },
        { key: 'nopSppt', label: 'NOP SPPT' },
        { key: 'namaWajibPajak', label: 'Nama WP' },
        { key: 'luasSppt', label: 'Luas SPPT' },
        { key: 'njopPermeter', label: 'NJOP/m2' },
        { key: 'dusunJalanGang', label: 'Dusun/Jalan' },
        { key: 'blok', label: 'Blok' },
        { key: 'rt', label: 'RT' },
        { key: 'rw', label: 'RW' },
        { key: 'desa', label: 'Desa Lokasi' },
        { key: 'kecamatanLokasi', label: 'Kecamatan Lokasi' },
        { key: 'luasDimohon', label: 'Luas Dimohon' },
        { key: 'diperolehMelalui', label: 'Diperoleh Melalui' },
        { key: 'buktiPerolehan', label: 'Bukti Perolehan' },
        { key: 'pemilikKe1Petok', label: 'Pemilik Ke-1' },
        { key: 'pemilikKe2', label: 'Pemilik Ke-2' },
        { key: 'pemilikKe3Pemohon', label: 'Pemilik Ke-3 (Pemohon)' },
        { key: 'tahunDimilikiPihakKe1', label: 'Tahun Milik 1' },
        { key: 'tahunDimilikiPihakKe3', label: 'Tahun Milik 3' },
        { key: 'petokC', label: 'Petok C' },
        { key: 'noPersil', label: 'Persil' },
        { key: 'kelas', label: 'Kelas' },
        { key: 'luas3', label: 'Luas (Riwayat)' },
        { key: 'pertanianNonPertanian', label: 'Jenis Tanah' },
        { key: 'utara', label: 'Batas Utara' },
        { key: 'timur', label: 'Batas Timur' },
        { key: 'selatan', label: 'Batas Selatan' },
        { key: 'barat', label: 'Batas Barat' },
        { key: 'namaSaksi1', label: 'Saksi 1' },
        { key: 'nikSaksi1', label: 'NIK Saksi 1' },
        { key: 'pekerjaanSaksi1', label: 'Pekerjaan Saksi 1' },
        { key: 'alamatSaksi1', label: 'Alamat Saksi 1' },
        { key: 'namaSaksi2', label: 'Saksi 2' },
        { key: 'nikSaksi2', label: 'NIK Saksi 2' },
        { key: 'pekerjaanSaksi2', label: 'Pekerjaan Saksi 2' },
        { key: 'alamatSaksi2', label: 'Alamat Saksi 2' },
        { key: 'namaKades', label: 'Kades' },
        { key: 'noAkteTanah', label: 'No Akte' },
        { key: 'keteranganTanah', label: 'Keterangan' },
        { key: 'operator', label: 'Operator' }
      ];
      headers = EXCEL_MAPPING.map(m => m.label);
      headers.push('Tanggal Input');
      filename = 'Template_PTSL_Utama.xlsx';
    } else if (type === 'WARGA') {
      headers = ['NIK', 'NAMA', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'ALAMAT', 'RT/RW', 'KEL/DESA', 'KECAMATAN', 'PEKERJAAN', 'NO HP'];
      filename = 'Template_Referensi_Warga.xlsx';
    } else if (type === 'SPPT') {
      headers = ['NOP', 'NAMA WAJIB PAJAK', 'LUAS SPPT', 'NJOP PERMETER', 'DUSUN', 'BLOK', 'RT', 'RW', 'DESA', 'KECAMATAN'];
      filename = 'Template_Referensi_SPPT.xlsx';
    }

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, filename);
  }
};
