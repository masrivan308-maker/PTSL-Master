import * as XLSX from 'xlsx';
import { PTSLData, DEFAULT_VALUES } from './types';
import { db, auth } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, addDoc, updateDoc, writeBatch } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Collections setup
const COL_PTSL = 'ptsl_data';
const COL_WARGA = 'master_warga';
const COL_SPPT = 'master_sppt';
const COL_USERS = 'users';

export const dbService = {
  // --- REAL-TIME LISTENERS ---
  listenPTSL: (callback: (data: PTSLData[]) => void) => {
    const q = query(collection(db, COL_PTSL));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PTSLData));
      callback(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, COL_PTSL));
  },

  listenWarga: (callback: (data: any[]) => void) => {
    const q = query(collection(db, COL_WARGA));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, COL_WARGA));
  },

  listenSppt: (callback: (data: any[]) => void) => {
    const q = query(collection(db, COL_SPPT));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, COL_SPPT));
  },

  listenUsers: (callback: (data: any[]) => void) => {
    const q = query(collection(db, COL_USERS));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, COL_USERS));
  },

  // --- CRUD OPERATIONS ---
  saveRow: async (row: PTSLData): Promise<void> => {
    try {
      const dataToSave = { ...row };
      if (!dataToSave.createdAt) dataToSave.createdAt = new Date().toISOString();
      
      if (row.id) {
        await setDoc(doc(db, COL_PTSL, row.id), dataToSave);
      } else {
        const docRef = doc(collection(db, COL_PTSL)); // auto id
        dataToSave.id = docRef.id;
        await setDoc(docRef, dataToSave);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, COL_PTSL);
    }
  },

  deleteRow: async (id: string) => {
    try {
      await deleteDoc(doc(db, COL_PTSL, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, COL_PTSL);
    }
  },

  getRefWarga: async (): Promise<any[]> => {
    try {
      const snapshot = await getDocs(collection(db, COL_WARGA));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, COL_WARGA);
      return [];
    }
  },

  getRefSppt: async (): Promise<any[]> => {
    try {
      const snapshot = await getDocs(collection(db, COL_SPPT));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, COL_SPPT);
      return [];
    }
  },

  saveRefWarga: async (dataList: any[]) => {
    try {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < dataList.length; i += CHUNK_SIZE) {
        const chunk = dataList.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const row of chunk) {
          if (row.id) {
            batch.set(doc(db, COL_WARGA, row.id), row);
          } else {
            const docRef = doc(collection(db, COL_WARGA));
            row.id = docRef.id;
            batch.set(docRef, row);
          }
        }
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, COL_WARGA);
    }
  },

  saveRefSppt: async (dataList: any[]) => {
    try {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < dataList.length; i += CHUNK_SIZE) {
        const chunk = dataList.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const row of chunk) {
          if (row.id) {
            batch.set(doc(db, COL_SPPT, row.id), row);
          } else {
            const docRef = doc(collection(db, COL_SPPT));
            row.id = docRef.id;
            batch.set(docRef, row);
          }
        }
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, COL_SPPT);
    }
  },
  
  deleteRefWarga: async (id: string) => {
    try {
      await deleteDoc(doc(db, COL_WARGA, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, COL_WARGA);
    }
  },
  
  deleteRefSppt: async (id: string) => {
    try {
      await deleteDoc(doc(db, COL_SPPT, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, COL_SPPT);
    }
  },

  updateUserRole: async (userId: string, role: string) => {
    try {
       await updateDoc(doc(db, COL_USERS, userId), { role });
    } catch (e) {
       handleFirestoreError(e, OperationType.UPDATE, COL_USERS);
    }
  },
  
  deleteUser: async (userId: string) => {
    try {
       await deleteDoc(doc(db, COL_USERS, userId));
    } catch (e) {
       handleFirestoreError(e, OperationType.DELETE, COL_USERS);
    }
  },

  // --- EXPORT / IMPORT SUPPORT ---
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

