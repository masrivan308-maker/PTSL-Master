import React, { useState } from 'react';
import { PTSLData } from '../types';
import { Search, FileSpreadsheet, Plus, Edit2, Trash2, ChevronDown, ChevronUp, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  rows: PTSLData[];
  onAdd: () => void;
  onEdit: (row: PTSLData) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}

const PAGE_SIZES = [25, 50, 100, 500];

export const PTSLList: React.FC<Props> = ({ rows, onAdd, onEdit, onDelete, onExport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const filteredRows = rows.filter(r => 
    r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.nib.includes(searchTerm) ||
    r.noKtp.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1); // Reset to first page on size change
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && filteredRows.length === 0) {
      alert(`⚠️ DATA TIDAK DITEMUKAN\nPencarian untuk "${searchTerm}" tidak membuahkan hasil.`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Cari Nama, NIB, atau NIK..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </form>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={onExport}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileSpreadsheet size={18} />
            Export XLS
          </button>
          <button 
            onClick={onAdd}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-105"
          >
            <Plus size={18} />
            Tambah Data
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-16">No</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informasi Dasar</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Objek Tanah</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedRows.map((row, idx) => (
                <React.Fragment key={row.id}>
                  <motion.tr 
                    layout
                    className={`group transition-colors cursor-pointer hover:bg-slate-50/80 ${expandedRow === row.id ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id || null)}
                  >
                    <td className="px-6 py-5 text-xs font-bold text-slate-400 text-center">{startIndex + idx + 1}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{row.nama}</span>
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                          <User size={10} className="text-indigo-500" />
                          NIK: {row.noKtp}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">NIB: {row.nib}</span>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{row.luas} m²</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                          <MapPin size={10} className="text-rose-500" />
                          {row.kelDesa}, {row.kecamatan}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => onEdit(row)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200"
                          title="Edit Data"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(row.id!)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200"
                          title="Hapus Data"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="p-2 text-slate-300 group-hover:text-slate-400 transition-colors">
                          {expandedRow === row.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                  
                  <AnimatePresence>
                    {expandedRow === row.id && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-50/30"
                      >
                        <td colSpan={4} className="px-6 py-6 border-b border-slate-100 shadow-inner">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Detail Pemohon</h4>
                              <div className="space-y-2">
                                <InfoLabel label="Tempat/Tgl Lahir" value={`${row.tempatLahir}, ${row.tanggalLahir}`} />
                                <InfoLabel label="Pekerjaan" value={row.pekerjaan} />
                                <InfoLabel label="No. HP" value={row.noHp} />
                                <InfoLabel label="Alamat" value={`${row.alamat} RT/RW ${row.rtRw}`} />
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-bold text-orange-600 uppercase tracking-widest border-b border-orange-100 pb-2">Objek Pajak (SPPT)</h4>
                              <div className="space-y-2">
                                <InfoLabel label="NOP SPPT" value={row.nopSppt} />
                                <InfoLabel label="Nama WP" value={row.namaWajibPajak} />
                                <InfoLabel label="Luas SPPT" value={`${row.luasSppt} m²`} />
                                <InfoLabel label="NJOP/m2" value={`Rp ${row.njopPermeter}`} />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest border-b border-emerald-100 pb-2">Data Tanah</h4>
                              <div className="space-y-2">
                                <InfoLabel label="Petok C" value={row.petokC} />
                                <InfoLabel label="Persil / Kelas" value={`${row.noPersil} / ${row.kelas}`} />
                                <InfoLabel label="Dusun/Blok" value={`${row.dusunJalanGang} / ${row.blok}`} />
                                <InfoLabel label="Jenis" value={row.pertanianNonPertanian} />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest border-b border-rose-100 pb-2">Batas-Batas</h4>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <InfoLabel label="Utara" value={row.utara} />
                                <InfoLabel label="Timur" value={row.timur} />
                                <InfoLabel label="Selatan" value={row.selatan} />
                                <InfoLabel label="Barat" value={row.barat} />
                              </div>
                              <div className="pt-2">
                                 <InfoLabel label="Saksi 1" value={row.namaSaksi1} />
                                 <InfoLabel label="Saksi 2" value={row.namaSaksi2} />
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm mb-4">
              <Search size={32} />
            </div>
            <p className="text-slate-500 font-bold">Data tidak ditemukan</p>
            <p className="text-[11px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Coba kata kunci pencarian lain</p>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredRows.length > 0 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tampilkan</span>
              <select 
                value={pageSize}
                onChange={handlePageSizeChange}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {PAGE_SIZES.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Per Halaman</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-500">
                Data {startIndex + 1} - {Math.min(startIndex + pageSize, filteredRows.length)} dari {filteredRows.length}
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl">
                   <span className="text-xs font-bold text-indigo-600">{currentPage}</span>
                   <span className="text-xs font-bold text-slate-300 mx-1">/</span>
                   <span className="text-xs font-bold text-slate-500">{totalPages}</span>
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center px-4 text-xs">
        <div className="flex gap-4">
          <span className="text-slate-400 font-bold uppercase tracking-widest">Database Offline</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-600 font-bold">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
           SISTEM AKTIF
        </div>
      </div>
    </div>
  );
};

const InfoLabel = ({ label, value }: { label: string, value: string }) => (
  <div className="flex flex-col">
    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
    <span className="text-[11px] font-bold text-slate-700 truncate">{value || '-'}</span>
  </div>
);
