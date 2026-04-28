import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Database, Search, Edit2, Trash2, PlusCircle, X, CheckCircle, Save, Upload, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [showSettings, setShowSettings] = useState(false);
  const [wargaUrl, setWargaUrl] = useState('');
  const [spptUrl, setSpptUrl] = useState('');

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

  const handleReloadCache = async () => {
    setIsLoading(true);
    try {
       const reloadPayload: any = {};
       if (wargaUrl.trim()) reloadPayload.wargaUrl = wargaUrl.trim();
       if (spptUrl.trim()) reloadPayload.spptUrl = spptUrl.trim();

       const res = await fetch('/api/master/reload', {
           method: Object.keys(reloadPayload).length > 0 ? 'POST' : 'GET',
           headers: { 'Content-Type': 'application/json' },
           body: Object.keys(reloadPayload).length > 0 ? JSON.stringify(reloadPayload) : undefined
       });
       const contentType = res.headers.get("content-type");
       if (contentType && contentType.indexOf("application/json") !== -1) {
           const data = await res.json();
           if (!res.ok) {
               throw new Error(data.message || `HTTP error! status: ${res.status}`);
           }
           if (data.status === 'loading') {
             alert("Data sedang dalam proses sinkronisasi oleh pengguna lain. Silakan tunggu sebentar.");
           } else if (data.status === 'error') {
             alert("Sinkronisasi gagal memuat data dari Google Sheet: " + data.message);
           } else {
             alert("Sinkronisasi server dengan Google Sheets selesai.");
             setShowSettings(false);
           }
           fetchData();
       } else {
           const textData = await res.text();
           console.error("Received non-JSON response:", textData.substring(0, 100));
           throw new Error("Server mengembalikan respons yang tidak valid (bukan JSON).");
       }
    } catch (e: any) {
       console.error("Reload cache error:", e);
       alert("Gagal sinkronisasi data: " + e.message);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Manajemen Data Master</h2>
          <p className="text-sm text-slate-500">Data bersumber langsung dari Google Sheets (Read-Only).</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-colors ${showSettings ? 'border border-indigo-200 bg-indigo-50 text-indigo-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            Pengaturan Link URL
          </button>
          <button 
            onClick={handleReloadCache}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            Sinkronisasi
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Database size={18}/> Custom Link Google Sheets</h3>
              <p className="text-sm text-indigo-700/80 mb-4 max-w-4xl">Masukkan link CSV dari Google Sheets yang telah dipublikasikan <span className="font-mono bg-white px-1.5 py-0.5 rounded text-xs select-auto">File &gt; Share &gt; Publish to web &gt; CSV</span>. Kosongkan untuk menggunakan URL bawaan (default).</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest pl-1">Link CSV Data Warga</label>
                  <input 
                    type="text" 
                    value={wargaUrl}
                    onChange={e => setWargaUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                    className="w-full text-sm font-mono border border-slate-200 rounded-lg px-4 py-2 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest pl-1">Link CSV Data SPPT</label>
                  <input 
                    type="text" 
                    value={spptUrl}
                    onChange={e => setSpptUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                    className="w-full text-sm font-mono border border-slate-200 rounded-lg px-4 py-2 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleReloadCache}
                  disabled={isLoading || (!wargaUrl && !spptUrl)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <Save size={16} /> Update & Sinkronisasikan Sekarang
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        <button 
          onClick={() => { setActiveTab('WARGA'); setPage(1); setSearchQuery(''); }}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'WARGA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Data Warga
        </button>
        <button 
          onClick={() => { setActiveTab('SPPT'); setPage(1); setSearchQuery(''); }}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'SPPT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Data SPPT
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

