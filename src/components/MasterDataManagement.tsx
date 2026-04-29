import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Database, Search, Edit2, Trash2, PlusCircle, X, CheckCircle, Save, Upload, RefreshCw, ChevronLeft, ChevronRight, FileSpreadsheet, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  startAfter, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  serverTimestamp, 
  getCountFromServer,
  CollectionReference,
  DocumentData,
  QueryDocumentSnapshot,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, signInWithGoogle } from '../firebase';

type DataSource = 'WARGA' | 'SPPT';

interface IndividualEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData: any;
  type: DataSource;
  isNew?: boolean;
}

const IndividualEditModal: React.FC<IndividualEditModalProps> = ({ isOpen, onClose, onSave, initialData, type, isNew }) => {
  const [formData, setFormData] = useState<any>(initialData || {});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      alert('Gagal menyimpan: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields = type === 'WARGA' 
    ? [
        { key: 'NIK', label: 'NIK', disabled: !isNew },
        { key: 'NAMA', label: 'Nama Lengkap' },
        { key: 'ALAMAT', label: 'Alamat' },
        { key: 'KEL_DESA', label: 'Kelurahan/Desa' }
      ]
    : [
        { key: 'NOP', label: 'NOP', disabled: !isNew },
        { key: 'NAMA_WAJIB_PAJAK', label: 'Nama Wajib Pajak' },
        { key: 'LUAS_SPPT', label: 'Luas SPPT', type: 'number' },
        { key: 'NJOP_PERMETER', label: 'NJOP /Meter', type: 'number' },
        { key: 'DUSUN', label: 'Dusun' },
        { key: 'BLOK', label: 'Blok' },
        { key: 'RT', label: 'RT' },
        { key: 'RW', label: 'RW' },
        { key: 'DESA', label: 'Desa' },
        { key: 'KECAMATAN', label: 'Kecamatan' }
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {isNew ? <PlusCircle size={18} className="text-green-600" /> : <Edit2 size={18} className="text-indigo-600" />}
            {isNew ? 'Tambah' : 'Edit'} Data {type}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
            {fields.map(f => (
              <div key={f.key} className={f.key === 'ALAMAT' || f.key === 'NAMA_WAJIB_PAJAK' ? 'md:col-span-2' : ''}>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{f.label}</label>
                <input 
                  type={f.type || 'text'}
                  value={formData[f.key] || ''}
                  onChange={e => setFormData({ ...formData, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                  disabled={f.disabled}
                  placeholder={`Masukkan ${f.label}`}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:opacity-50"
                  required={f.key === 'NIK' || f.key === 'NOP' || f.key === 'NAMA' || f.key === 'NAMA_WAJIB_PAJAK'}
                />
              </div>
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 text-sm font-bold text-white ${isNew ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} rounded-lg transition flex items-center justify-center gap-2`}
            >
              {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : (isNew ? <CheckCircle size={16} /> : <Save size={16} />)}
              {isNew ? 'Simpan Baru' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export const MasterDataManagement: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<DataSource>('WARGA');
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Selection for edit
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const fileInputWargaRef = useRef<HTMLInputElement>(null);
  const fileInputSpptRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user) fetchData();
  }, [activeTab, page, limit, debouncedSearch, user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const collectionName = activeTab === 'WARGA' ? 'master_warga' : 'master_sppt';
      const colRef = collection(db, collectionName);
      
      // Get total count
      const countSnapshot = await getCountFromServer(colRef);
      const totalCount = countSnapshot.data().count;
      setTotal(totalCount);
      setTotalPages(Math.ceil(totalCount / limit));

      // Build query
      let q = query(colRef, orderBy(activeTab === 'WARGA' ? 'NIK' : 'NOP'), limit(limit));
      
      if (debouncedSearch) {
        q = query(
          colRef, 
          where(activeTab === 'WARGA' ? 'NIK' : 'NOP', '>=', debouncedSearch),
          where(activeTab === 'WARGA' ? 'NIK' : 'NOP', '<=', debouncedSearch + '\uf8ff'),
          limit(limit)
        );
      } else if (page > 1) {
        const skipQ = query(colRef, orderBy(activeTab === 'WARGA' ? 'NIK' : 'NOP'), limit((page - 1) * limit));
        const skipSnapshot = await getDocs(skipQ);
        const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        if (lastDoc) {
          q = query(colRef, orderBy(activeTab === 'WARGA' ? 'NIK' : 'NOP'), startAfter(lastDoc), limit(limit));
        }
      }

      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setData(results);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const processData = async (source: File, type: DataSource) => {
    setIsLoading(true);
    setUploadProgress('Membaca data...');
    try {
      let parsedData: any[] = [];
      const isCsv = source.name.endsWith('.csv');
      
      if (isCsv) {
        parsedData = await new Promise((resolve, reject) => {
          Papa.parse(source, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
          });
        });
      } else {
        const buffer = await source.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        parsedData = XLSX.utils.sheet_to_json(worksheet);
      }

      if (parsedData.length === 0) throw new Error('File kosong atau format tidak sesuai.');

      const collectionName = type === 'WARGA' ? 'master_warga' : 'master_sppt';
      const keyField = type === 'WARGA' ? 'NIK' : 'NOP';

      // Transform data keys to be consistent with our rules and blueprint
      const cleanedData = parsedData.map(item => {
        const newItem: any = { updatedAt: serverTimestamp() };
        if (type === 'WARGA') {
          const nik = String(item['NIK'] || item['noKtp'] || '');
          if (!nik) return null;
          newItem.NIK = nik;
          newItem.NAMA = item['NAMA'] || item['nama'] || '-';
          newItem.ALAMAT = item['ALAMAT'] || item['alamat'] || '-';
          newItem.KEL_DESA = item['KEL/DESA'] || item['kelDesa'] || '-';
        } else {
          const nop = String(item['NOP'] || item['nopSppt'] || '');
          if (!nop) return null;
          newItem.NOP = nop;
          newItem.NAMA_WAJIB_PAJAK = item['NAMA WAJIB PAJAK'] || item['namaWajibPajak'] || '-';
          newItem.LUAS_SPPT = Number(item['LUAS SPPT'] || item['luasSppt'] || 0);
          newItem.NJOP_PERMETER = Number(item['NJOP PERMETER'] || item['njopPermeter'] || 0);
          newItem.DUSUN = item['DUSUN'] || '-';
          newItem.BLOK = item['BLOK'] || '-';
          newItem.RT = String(item['RT'] || '-');
          newItem.RW = String(item['RW'] || '-');
          newItem.DESA = item['DESA'] || '-';
          newItem.KECAMATAN = item['KECAMATAN'] || '-';
        }
        return newItem;
      }).filter(Boolean);

      setUploadProgress(`Menyiapkan ${cleanedData.length} data...`);
      
      // Firestore batch limit is 500
      const batchSize = 500;
      for (let i = 0; i < cleanedData.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = cleanedData.slice(i, i + batchSize);
        
        chunk.forEach(item => {
          const docRef = doc(db, collectionName, item[keyField]);
          batch.set(docRef, item);
        });

        await batch.commit();
        setUploadProgress(`Sinkronisasi Firestore... ${Math.min(i + batchSize, cleanedData.length)} / ${cleanedData.length}`);
      }

      alert(`Berhasil mengunggah ${cleanedData.length} data ke Firestore.`);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert('Gagal memproses data: ' + e.message);
    } finally {
      setIsLoading(false);
      setUploadProgress('');
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      const collectionName = activeTab === 'WARGA' ? 'master_warga' : 'master_sppt';
      await deleteDoc(doc(db, collectionName, id));
      setData(data.filter(item => item.id !== id));
      setTotal(t => t - 1);
    } catch (err) {
      alert('Gagal menghapus data.');
    }
  };

  const saveEditedRecord = async (formData: any) => {
    const collectionName = activeTab === 'WARGA' ? 'master_warga' : 'master_sppt';
    const keyField = activeTab === 'WARGA' ? 'NIK' : 'NOP';
    const id = formData[keyField];
    const docRef = doc(db, collectionName, id);
    
    const payload = { ...formData, updatedAt: serverTimestamp() };
    await setDoc(docRef, payload, { merge: true });
    
    // Refresh local state
    setData(data.map(item => item.id === id ? { ...item, ...payload } : item));
  };

  const clearMasterData = async () => {
    if (!confirm(`Hapus SEMUA data master ${activeTab}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setIsLoading(true);
    setUploadProgress('Menghapus data masal...');
    try {
      const collectionName = activeTab === 'WARGA' ? 'master_warga' : 'master_sppt';
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(query(colRef, limit(500))); // Batch delete limit
      
      let deletedCount = 0;
      let currentSnapshot = snapshot;
      
      while (currentSnapshot.size > 0) {
        const batch = writeBatch(db);
        currentSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          deletedCount++;
        });
        await batch.commit();
        setUploadProgress(`Menghapus... ${deletedCount} data terhapus`);
        
        // Fetch next set
        currentSnapshot = await getDocs(query(colRef, limit(500)));
      }
      
      alert(`Berhasil menghapus ${deletedCount} data.`);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus data masal.');
    } finally {
      setIsLoading(false);
      setUploadProgress('');
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Terbatas</h2>
        <p className="text-slate-500 max-w-md mb-8">Anda harus masuk untuk mengelola data master yang tercatat di sistem cloud.</p>
        <button 
          onClick={signInWithGoogle}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg flex items-center gap-3"
        >
          <Database size={20} />
          Masuk dengan Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <IndividualEditModal 
        isOpen={!!editingItem || isAddingNew} 
        onClose={() => { setEditingItem(null); setIsAddingNew(false); }} 
        onSave={saveEditedRecord}
        initialData={editingItem}
        type={activeTab}
        isNew={isAddingNew}
      />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Manajemen Data Master</h2>
          <p className="text-sm text-slate-500">Input manual atau unggah file untuk data masal.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            className="hidden"
            ref={fileInputWargaRef}
            onChange={(e) => handleFileUpload(e, 'WARGA')}
          />
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            className="hidden"
            ref={fileInputSpptRef}
            onChange={(e) => handleFileUpload(e, 'SPPT')}
          />
          <button 
            id="btn-add-manual"
            onClick={() => setIsAddingNew(true)}
            className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg flex items-center gap-2 font-bold hover:bg-slate-50 transition shadow-sm"
          >
            <PlusCircle size={18} className="text-green-600" />
            Tambah Manual
          </button>
          <button 
            id="btn-upload-master"
            onClick={() => activeTab === 'WARGA' ? fileInputWargaRef.current?.click() : fileInputSpptRef.current?.click()}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
          >
            <Upload size={18} />
            Upload {activeTab === 'WARGA' ? 'NIK' : 'NOP'}
          </button>
        </div>
      </div>

      {uploadProgress && <div id="upload-status-indicator" className="bg-indigo-50 text-indigo-700 p-3 rounded-lg flex items-center gap-3 font-semibold mb-6 animate-pulse"><RefreshCw size={20} className="animate-spin" /> {uploadProgress}</div>}


      <div className="flex justify-between items-end mb-6">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            id="tab-warga"
            onClick={() => { setActiveTab('WARGA'); setPage(1); setSearchQuery(''); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'WARGA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Data Warga
          </button>
          <button 
            id="tab-sppt"
            onClick={() => { setActiveTab('SPPT'); setPage(1); setSearchQuery(''); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'SPPT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Data SPPT
          </button>
        </div>
        <button 
          id="btn-clear-master"
          onClick={clearMasterData}
          disabled={isLoading}
          className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
        >
          <Trash2 size={14} /> Kosongkan Data {activeTab}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari data dari server..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
             <span>Data per halaman:</span>
             <select 
               value={limit} 
               onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
               className="bg-white border border-slate-200 rounded-md px-2 py-1 outline-none"
             >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
             </select>
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-[400px]">
          {isLoading && data.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-12 h-[400px] text-slate-400">
                <RefreshCw size={32} className="animate-spin mb-4" />
                <p>Memuat data dari server...</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap relative">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {activeTab === 'WARGA' ? (
                    <>
                      <th className="p-4 pl-6">NIK</th>
                      <th className="p-4">Nama Lengkap</th>
                      <th className="p-4">Alamat</th>
                      <th className="p-4 text-center">Aksi</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4 pl-6">NOP</th>
                      <th className="p-4">Nama Wajib Pajak</th>
                      <th className="p-4 text-center">Luas / NJOP</th>
                      <th className="p-4">Dusun / Blok</th>
                      <th className="p-4">RT / RW</th>
                      <th className="p-4">Desa / Kec.</th>
                      <th className="p-4 text-center">Aksi</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.id || i} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors ${isLoading ? 'opacity-50' : ''}`}>
                    {activeTab === 'WARGA' ? (
                      <>
                        <td className="p-4 pl-6 font-mono text-sm text-slate-700">{row['NIK'] || '-'}</td>
                        <td className="p-4 font-bold text-slate-800 text-sm">{row['NAMA'] || '-'}</td>
                        <td className="p-4 text-sm text-slate-600 truncate max-w-[300px]">{row['ALAMAT'] || '-'} - {row['KEL_DESA'] || row['KEL/DESA'] || '-'}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                             <button onClick={() => setEditingItem(row)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit2 size={16}/></button>
                             <button onClick={() => deleteRecord(row.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 pl-6 font-mono text-sm text-slate-700">{row['NOP'] || '-'}</td>
                        <td className="p-4 font-bold text-slate-800 text-sm whitespace-normal min-w-[150px]">{row['NAMA_WAJIB_PAJAK'] || '-'}</td>
                        <td className="p-4 text-sm text-slate-600 text-center">
                          <div className="font-bold">{row['LUAS_SPPT'] || '-'} m²</div>
                          <div className="text-[10px] text-slate-400">Rp {row['NJOP_PERMETER'] || '-'}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>{row['DUSUN'] || '-'}</div>
                          <div className="text-[10px] text-slate-400 font-bold">BLOK: {row['BLOK'] || '-'}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {row['RT'] || '-'}/{row['RW'] || '-'}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <div className="font-medium">{row['DESA'] || '-'}</div>
                          <div className="text-[10px] text-slate-400">{row['KECAMATAN'] || '-'}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                             <button onClick={() => setEditingItem(row)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit2 size={16}/></button>
                             <button onClick={() => deleteRecord(row.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={activeTab === 'WARGA' ? 4 : 7} className="p-16 text-center">
                      <div className="flex flex-col items-center max-w-sm mx-auto">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                           <Database size={32} />
                        </div>
                        <h4 className="text-slate-800 font-bold mb-1">Database Cloud Kosong</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          {searchQuery 
                            ? `Tidak ada data master ${activeTab} yang cocok dengan pencarian "${searchQuery}".`
                            : `Data master ${activeTab} belum terisi. Silakan tambah data secara manual atau unggah file CSV/Excel.`}
                        </p>
                        {!searchQuery && (
                          <div className="mt-6 flex flex-wrap justify-center gap-2">
                             <button onClick={() => setIsAddingNew(true)} className="px-4 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100 hover:bg-green-100 transition flex items-center gap-2">
                                <PlusCircle size={14} /> Tambah Manual
                             </button>
                             <button onClick={() => activeTab === 'WARGA' ? fileInputWargaRef.current?.click() : fileInputSpptRef.current?.click()} className="px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 hover:bg-indigo-100 transition flex items-center gap-2">
                                <Upload size={14} /> Upload File
                             </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium tracking-wide">
              Menampilkan {data.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, total)} dari <strong>{total}</strong> data
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1 px-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <ChevronLeft size={16} className="inline mr-1" />
                Sebelumnnya
              </button>
              <div className="px-3 py-1 text-sm font-bold border border-transparent text-slate-700">
                 Halaman {page} dari {totalPages}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1 px-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Selanjutnya
                <ChevronRight size={16} className="inline ml-1" />
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

