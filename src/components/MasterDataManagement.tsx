import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Database, Search, Edit2, Trash2, PlusCircle, X, CheckCircle, Save, Upload, RefreshCw, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type DataSource = 'WARGA' | 'SPPT';

export const MasterDataManagement: React.FC = () => {
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState(() => localStorage.getItem('googleSheetUrl') || '');

  const fileInputWargaRef = useRef<HTMLInputElement>(null);
  const fileInputSpptRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('googleSheetUrl', googleSheetUrl);
  }, [googleSheetUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [activeTab, page, limit, debouncedSearch]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const endpoint = activeTab === 'WARGA' ? '/api/master/warga' : '/api/master/sppt';
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch
      });
      const res = await fetch(`${endpoint}?${params.toString()}`);
      
      if (!res.ok) {
        if (res.status === 503) {
           console.warn("Data is loading on server...");
           setTimeout(fetchData, 2000);
           return;
        }
        throw new Error('Failed to fetch data');
      }

      const result = await res.json();
      setData(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: DataSource) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processData(file, type);
    if (event.target) event.target.value = '';
  };

  const handleSyncUrl = async () => {
    if (!googleSheetUrl) return;
    setIsLoading(true);
    setUploadProgress('Sinkronisasi data oleh server...');
    try {
      const res = await fetch('/api/master/sync-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleSheetUrl, type: activeTab })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Gagal sinkronisasi data.');
      
      alert(`Berhasil: ${result.message}`);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert('Gagal Sinkronisasi: ' + e.message);
    } finally {
      setIsLoading(false);
      setUploadProgress('');
    }
  };

  const processData = async (source: File, type: DataSource) => {
    setIsLoading(true);
    setUploadProgress('Membaca data...');
    try {
      let parsedData: any[] = [];
      
      // Handle Local File
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

      const endpoint = type === 'WARGA' ? '/api/master/warga/upload' : '/api/master/sppt/upload';
      
      // Upload in smaller chunks with delay to avoid 413 and timeouts
      const chunkSize = 2000; 
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      
      let result;
      for (let i = 0; i < parsedData.length; i += chunkSize) {
        const chunk = parsedData.slice(i, i + chunkSize);
        setUploadProgress(`Mengunggah data... ${Math.min(i + chunkSize, parsedData.length)} / ${parsedData.length}`);
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: chunk, append: i > 0 })
        });

        if (!res.ok) {
           const errText = await res.text();
           let errMsg = `Server error (${res.status})`;
           try {
             errMsg = JSON.parse(errText).message || errMsg;
           } catch (e) {
             if (res.status === 413) errMsg = "Payload too large. Chunk size too big.";
           }
           throw new Error(errMsg);
        }
        result = await res.json();
        if (i + chunkSize < parsedData.length) await delay(50);
      }
      
      alert(`Berhasil: ${result?.message || 'Data berhasil diunggah.'}`);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert('Gagal memproses data: ' + e.message);
    } finally {
      setIsLoading(false);
      setUploadProgress('');
    }
  };

  const clearMasterData = async () => {
    if (!confirm(`Hapus semua data master ${activeTab}?`)) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/master/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab })
      });
      const result = await res.json();
      alert(result.message);
      fetchData();
    } catch (e) {
      alert('Gagal menghapus data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Manajemen Data Master</h2>
          <p className="text-sm text-slate-500">Unggah file CSV atau Excel untuk bantuan input otomatis.</p>
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
            id="btn-toggle-sync-url"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className={`px-4 py-2 ${showUrlInput ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-700 border border-slate-200'} rounded-lg flex items-center gap-2 font-bold hover:bg-amber-50 transition shadow-sm`}
          >
            <RefreshCw size={18} className={showUrlInput ? "text-amber-600" : ""} />
            Sync URL
          </button>
          <button 
            id="btn-upload-warga"
            onClick={() => fileInputWargaRef.current?.click()}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
          >
            <Upload size={18} />
            Upload Warga
          </button>
          <button 
            id="btn-upload-sppt"
            onClick={() => fileInputSpptRef.current?.click()}
            disabled={isLoading}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-teal-700 transition disabled:opacity-50 shadow-sm"
          >
            <Upload size={18} />
            Upload SPPT
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showUrlInput && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 bg-amber-50 border border-amber-100 p-6 rounded-2xl overflow-hidden"
          >
            <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2"><Database size={18}/> Sinkronisasi Google Sheets</h3>
            <p className="text-xs text-amber-700/80 mb-4">Masukkan link CSV dari Google Sheets (File &gt; Share &gt; Publish to web &gt; CSV). Link ini akan disimpan secara lokal di browser Anda.</p>
            <div className="flex gap-3">
              <input 
                id="input-google-sheet-url"
                type="text" 
                value={googleSheetUrl}
                onChange={e => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                className="flex-1 px-4 py-2 bg-white border border-amber-200 rounded-lg text-sm font-mono outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
              <button 
                id="btn-sync-now"
                onClick={handleSyncUrl}
                disabled={!googleSheetUrl || isLoading}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                Sync ke {activeTab}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    </>
                  ) : (
                    <>
                      <th className="p-4 pl-6">NOP</th>
                      <th className="p-4">Nama Wajib Pajak</th>
                      <th className="p-4 text-center">Luas / NJOP</th>
                      <th className="p-4">Dusun / Blok</th>
                      <th className="p-4">RT / RW</th>
                      <th className="p-4">Desa / Kec.</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors ${isLoading ? 'opacity-50' : ''}`}>
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
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={activeTab === 'WARGA' ? 3 : 6} className="p-8 text-center text-slate-500 text-sm">
                      {searchQuery ? 'Data tidak ditemukan.' : 'Belum ada data referensi.'}
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

