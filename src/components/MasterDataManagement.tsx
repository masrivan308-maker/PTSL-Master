import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../dbService';
import { ShieldCheck, Database, Search, Edit2, Trash2, PlusCircle, X, CheckCircle, Save, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

type DataSource = 'WARGA' | 'SPPT';

export const MasterDataManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DataSource>('WARGA');
  const [wargaData, setWargaData] = useState<any[]>([]);
  const [spptData, setSpptData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit & Add State
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteAll = async () => {
    const confirmMessage = `PERINGATAN: Anda akan menghapus SEMUA data ${activeTab}. Tindakan ini tidak dapat dibatalkan.\n\nKetik "HAPUS" untuk mengkonfirmasi:`;
    const input = prompt(confirmMessage);
    
    if (input !== 'HAPUS') {
      if (input !== null) alert('Konfirmasi salah. Penghapusan dibatalkan.');
      return;
    }

    setIsDeletingAll(true);
    try {
      if (activeTab === 'WARGA') {
        await dbService.deleteAllRefWarga();
      } else {
        await dbService.deleteAllRefSppt();
      }
      alert(`Berhasil menghapus semua data ${activeTab}.`);
    } catch (err: any) {
      alert('Gagal menghapus semua data: ' + err.message);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); // Convert to JSON
      
      if (json.length === 0) {
        alert("File kosong atau format salah.");
        return;
      }
      
      // Clean up headers (assuming first row is headers) and stringify fields if needed
      // Normalize keys to uppercase to match lookup logic
      const cleanData = json.map((row: any) => {
        const cleanRow: any = {};
        for (const key in row) {
          const cleanKey = key.trim().toUpperCase();
          cleanRow[cleanKey] = String(row[key]).trim(); // Convert to string
        }
        return cleanRow;
      });

      if (activeTab === 'WARGA') {
        await dbService.saveRefWarga(cleanData);
      } else {
        await dbService.saveRefSppt(cleanData);
      }
      alert(`Berhasil mengunggah ${cleanData.length} data ${activeTab}.`);
    } catch (error: any) {
      console.error(error);
      alert(`Gagal mengunggah file: ${error.message}`);
    } finally {
      setIsUploading(false);
      // reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    const unsubWarga = dbService.listenWarga((data) => setWargaData(data));
    const unsubSppt = dbService.listenSppt((data) => setSpptData(data));
    
    return () => {
      unsubWarga();
      unsubSppt();
    };
  }, []);

  const handleOpenModal = (record: any = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData(record);
    } else {
      setEditingRecord(null);
      if (activeTab === 'WARGA') {
        setFormData({
          NIK: '', NAMA: '', 'TEMPAT LAHIR': '', 'TANGGAL LAHIR': '', ALAMAT: '', 'RT/RW': '', 'KEL/DESA': '', KECAMATAN: '', PEKERJAAN: '', 'NO HP': ''
        });
      } else {
        setFormData({
          NOP: '', 'NAMA WAJIB PAJAK': '', 'LUAS SPPT': '', 'NJOP PERMETER': '', DUSUN: '', BLOK: '', RT: '', RW: '', DESA: '', KECAMATAN: ''
        });
      }
    }
    setShowModal(true);
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'WARGA') {
        const payload = editingRecord ? { ...editingRecord, ...formData } : { ...formData };
        await dbService.saveRefWarga([payload]);
      } else {
         const payload = editingRecord ? { ...editingRecord, ...formData } : { ...formData };
         await dbService.saveRefSppt([payload]);
      }
      setShowModal(false);
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data referensi ini secara permanen?')) return;
    try {
      if (activeTab === 'WARGA') {
        await dbService.deleteRefWarga(id);
      } else {
        await dbService.deleteRefSppt(id);
      }
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const currentData = activeTab === 'WARGA' ? wargaData : spptData;
  const filteredData = currentData
    .filter(r => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      // Only check up to a limit or we can just use normal filter
      return Object.values(r).some(val => String(val).toLowerCase().includes(q));
    }); // Display all data as requested

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Manajemen Data Master</h2>
          <p className="text-sm text-slate-500">Kelola langsung referensi Data Warga dan Data SPPT.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <Upload size={18} />
            {isUploading ? 'Mengunggah...' : `Unggah Data ${activeTab === 'WARGA' ? 'Warga' : 'SPPT'}`}
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-indigo-700 transition"
          >
            <PlusCircle size={18} />
            Tambah Data {activeTab === 'WARGA' ? 'Warga' : 'SPPT'}
          </button>
          <button 
            onClick={handleDeleteAll}
            disabled={isDeletingAll || currentData.length === 0}
            className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg flex items-center gap-2 font-bold hover:bg-rose-100 transition disabled:opacity-50"
            title="Hapus Semua Data"
          >
            <Trash2 size={18} />
            {isDeletingAll ? 'Menghapus...' : 'Kosongkan'}
          </button>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        <button 
          onClick={() => setActiveTab('WARGA')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'WARGA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Data Warga ({wargaData.length})
        </button>
        <button 
          onClick={() => setActiveTab('SPPT')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'SPPT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Data SPPT ({spptData.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Cari dari ${currentData.length} data...`}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Menampilkan {filteredData.length} dari {currentData.length} data
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {activeTab === 'WARGA' ? (
                  <>
                    <th className="p-4 pl-6">NIK</th>
                    <th className="p-4">Nama Lengkap</th>
                    <th className="p-4">Alamat</th>
                    <th className="p-4 text-right pr-6">Aksi</th>
                  </>
                ) : (
                  <>
                    <th className="p-4 pl-6">NOP</th>
                    <th className="p-4">Nama Wajib Pajak</th>
                    <th className="p-4 text-center">Luas / NJOP</th>
                    <th className="p-4">Dusun / Blok</th>
                    <th className="p-4">RT / RW</th>
                    <th className="p-4">Desa / Kec.</th>
                    <th className="p-4 text-right pr-6">Aksi</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
                <tr key={row.id || i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  {activeTab === 'WARGA' ? (
                    <>
                      <td className="p-4 pl-6 font-mono text-sm text-slate-700">{row['NIK'] || row['noKtp'] || '-'}</td>
                      <td className="p-4 font-bold text-slate-800 text-sm">{row['NAMA'] || row['nama'] || '-'}</td>
                      <td className="p-4 text-sm text-slate-600 truncate max-w-[300px]">{row['ALAMAT'] || row['alamat'] || '-'} - {row['KEL/DESA'] || row['kelDesa']}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 pl-6 font-mono text-sm text-slate-700">{row['NOP'] || row['nopSppt'] || '-'}</td>
                      <td className="p-4 font-bold text-slate-800 text-sm whitespace-normal min-w-[150px]">{row['NAMA WAJIB PAJAK'] || row['namaWajibPajak'] || '-'}</td>
                      <td className="p-4 text-sm text-slate-600 text-center">
                        <div className="font-bold">{row['LUAS SPPT'] || row['luasSppt'] || '-'} m²</div>
                        <div className="text-[10px] text-slate-400">Rp {row['NJOP PERMETER'] || row['njopPermeter'] || '-'}</div>
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
                    </>
                  )}
                  <td className="p-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(row)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(row.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'WARGA' ? 4 : 7} className="p-8 text-center text-slate-500 text-sm">
                    {searchQuery ? 'Data tidak ditemukan.' : 'Belum ada data referensi.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {editingRecord ? <Edit2 size={18} className="text-indigo-600" /> : <PlusCircle size={18} className="text-indigo-600" />}
                  {editingRecord ? 'Edit Data' : 'Tambah Data'} {activeTab === 'WARGA' ? 'Warga' : 'SPPT'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-800 p-1 hover:bg-slate-200 rounded-md transition">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <form id="master-data-form" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {Object.keys(formData).filter(k => k !== 'id').map(key => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{key}</label>
                      <input 
                        type="text" 
                        value={formData[key] || ''}
                        onChange={e => handleChange(key, e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder={`Masukkan ${key}...`}
                      />
                    </div>
                  ))}
                </form>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  form="master-data-form"
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Simpan Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
