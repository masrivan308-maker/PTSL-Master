import * as XLSX from 'xlsx';
import { PTSLData } from './types';

const STORAGE_KEY = 'ptsl_database';
const REF_WARGA_KEY = 'ref_warga';
const REF_SPPT_KEY = 'ref_sppt';
const USERS_KEY = 'ptsl_users';

export const dbService = {
  // User Management
  getUsers: (): any[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  registerUser: (username: string, password: string) => {
    const users = dbService.getUsers();
    if (users.find(u => u.username === username)) {
      throw new Error('Username sudah digunakan');
    }
    users.push({ username, password });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  authenticate: (username: string, password: string) => {
    const users = dbService.getUsers();
    return users.find(u => u.username === username && u.password === password);
  },

  clearAllRows: () => {
    localStorage.removeItem(STORAGE_KEY);
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
  saveRefWarga: (data: any[]) => {
    localStorage.setItem(REF_WARGA_KEY, JSON.stringify(data));
  },

  getRefWarga: (): any[] => {
    const data = localStorage.getItem(REF_WARGA_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveRefSppt: (data: any[]) => {
    localStorage.setItem(REF_SPPT_KEY, JSON.stringify(data));
  },

  getRefSppt: (): any[] => {
    const data = localStorage.getItem(REF_SPPT_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  deleteRow: (id: string) => {
    const rows = dbService.getRows();
    const filtered = rows.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },
  
  exportToExcel: (data: PTSLData[]) => {
    // Format headers for readable Excel
    const formattedData = data.map(row => ({
      'NIB': row.nib,
      'Luas (M2)': row.luas,
      'NIK Pemohon': row.noKtp,
      'Nama Pemohon': row.nama,
      'Tempat Lahir': row.tempatLahir,
      'Tanggal Lahir': row.tanggalLahir,
      'Pekerjaan': row.pekerjaan,
      'No HP': row.noHp,
      'Alamat': row.alamat,
      'RT/RW': row.rtRw,
      'Kel/Desa': row.kelDesa,
      'Kecamatan': row.kecamatan,
      'NOP SPPT': row.nopSppt,
      'Nama WP': row.namaWajibPajak,
      'Luas SPPT': row.luasSppt,
      'NJOP/m2': row.njopPermeter,
      'Dusun/Jalan': row.dusunJalanGang,
      'Blok': row.blok,
      'Desa Lokasi': row.desa,
      'Luas Dimohon': row.luasDimohon,
      'Diperoleh Melalui': row.diperolehMelalui,
      'Bukti Perolehan': row.buktiPerolehan,
      'Petok C': row.petokC,
      'Persil': row.noPersil,
      'Kelas': row.kelas,
      'Batas Utara': row.utara,
      'Batas Timur': row.timur,
      'Batas Selatan': row.selatan,
      'Batas Barat': row.barat,
      'Saksi 1': row.namaSaksi1,
      'NIK Saksi 1': row.nikSaksi1,
      'Saksi 2': row.namaSaksi2,
      'NIK Saksi 2': row.nikSaksi2,
      'Kades': row.namaKades,
      'Operator': row.operator || 'System',
      'Tanggal Input': row.createdAt
    }));
    
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data PTSL");
    
    // Save file
    XLSX.writeFile(wb, `PTSL_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  },
  
  importFromExcel: async (file: File): Promise<PTSLData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        const validatedRows = rows.map((row: any) => ({
          ...row,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString()
        })) as PTSLData[];
        
        resolve(validatedRows);
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  },

  downloadTemplate: (type: 'PTSL' | 'WARGA' | 'SPPT') => {
    let headers: string[] = [];
    let filename = '';

    if (type === 'PTSL') {
      headers = [
        'nib', 'luas', 'noKtp', 'nama', 'tempatLahir', 'tanggalLahir', 'alamat', 
        'rtRw', 'kelDesa', 'kecamatan', 'pekerjaan', 'noHp', 'nopSppt', 
        'namaWajibPajak', 'luasSppt', 'njopPermeter', 'dusunJalanGang', 'blok', 
        'rt', 'rw', 'desa', 'kecamatanLokasi', 'luasDimohon', 'diperolehMelalui', 
        'buktiPerolehan', 'pemilikKe1Petok', 'pemilikKe2', 'pemilikKe3Pemohon', 
        'tahunDimilikiPihakKe1', 'tahunDimilikiPihakKe3', 'petokC', 'noPersil', 
        'kelas', 'luas3', 'pertanianNonPertanian', 'utara', 'timur', 'selatan', 
        'barat', 'namaSaksi1', 'nikSaksi1', 'pekerjaanSaksi1', 'alamatSaksi1',
        'namaSaksi2', 'nikSaksi2', 'pekerjaanSaksi2', 'alamatSaksi2',
        'namaKades', 'keteranganTanah', 'noAkteTanah', 'operator'
      ];
      filename = 'Template_PTSL_Utama.xlsx';
    } else if (type === 'WARGA') {
      headers = ['NIK', 'NAMA', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'ALAMAT', 'RT/RW', 'KEL/DESA', 'KECAMATAN', 'PEKERJAAN', 'NO HP'];
      filename = 'Template_Referensi_Warga.xlsx';
    } else if (type === 'SPPT') {
      headers = ['NOP', 'NAMA WAJIB PAJAK', 'LUAS SPPT', 'NJOP PERMETER'];
      filename = 'Template_Referensi_SPPT.xlsx';
    }

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, filename);
  }
};
