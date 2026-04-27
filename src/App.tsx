import React, { useState, useEffect } from 'react';
import { PTSLData } from './types';
import { dbService } from './dbService';
import { PTSLList } from './components/PTSLList';
import { PTSLForm } from './components/PTSLForm';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { MasterDataManagement } from './components/MasterDataManagement';
import { Upload, HelpCircle, X, LayoutDashboard, FileSpreadsheet, PlusCircle, Database, LogOut, User, RefreshCw, Link, Users } from 'lucide-react';

type View = 'list' | 'form' | 'users' | 'master';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('pts_user'));
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(localStorage.getItem('pts_user_role'));
  const [view, setView] = useState<View>('list');
  const [rows, setRows] = useState<PTSLData[]>([]);
  const [editingRow, setEditingRow] = useState<PTSLData | undefined>();
  const [showImport, setShowImport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [gsheetIdUtama, setGsheetIdUtama] = useState(localStorage.getItem('gsheet_id_utama') || '');
  const [gsheetIdWarga, setGsheetIdWarga] = useState(localStorage.getItem('gsheet_id_warga') || '');
  const [gsheetIdSppt, setGsheetIdSppt] = useState(localStorage.getItem('gsheet_id_sppt') || '');

  useEffect(() => {
    setRows(dbService.getRows());
  }, []);

  const handleSyncGSheet = async (type: 'UTAMA' | 'WARGA' | 'SPPT') => {
    const id = type === 'UTAMA' ? gsheetIdUtama : type === 'WARGA' ? gsheetIdWarga : gsheetIdSppt;
    if (!id) return alert('Silakan masukkan ID atau Link Google Sheet terlebih dahulu');
    
    setIsSyncing(true);
    try {
      const data = await dbService.syncWithGoogleSheet(id);
      if (type === 'UTAMA') {
        const parsed = dbService.parsePTSLDataFromExcel(data);
        dbService.clearAllRows();
        parsed.forEach(row => dbService.saveRow(row));
        setRows(dbService.getRows());
        localStorage.setItem('gsheet_id_utama', id);
        alert(`✅ SINKRONISASI BERHASIL\nBerhasil mengambil ${parsed.length} data Utama dari Google Sheets.`);
      } else if (type === 'WARGA') {
        await dbService.saveRefWarga(data);
        localStorage.setItem('gsheet_id_warga', id);
        alert(`✅ SINKRONISASI BERHASIL\nBerhasil mengambil ${data.length} data referensi Warga dari Google Sheets.`);
      } else {
        await dbService.saveRefSppt(data);
        localStorage.setItem('gsheet_id_sppt', id);
        alert(`✅ SINKRONISASI BERHASIL\nBerhasil mengambil ${data.length} data referensi SPPT dari Google Sheets.`);
      }
    } catch (err: any) {
      alert('❌ GAGAL SINKRONISASI\n' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (user: any) => {
    setCurrentUser(user.username);
    setCurrentUserRole(user.role);
    localStorage.setItem('pts_user', user.username);
    localStorage.setItem('pts_user_role', user.role);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserRole(null);
    localStorage.removeItem('pts_user');
    localStorage.removeItem('pts_user_role');
  };

  const handleSave = (data: PTSLData) => {
    const dataWithMeta = {
      ...data,
      operator: currentUser || 'Unknown'
    };
    dbService.saveRow(dataWithMeta);
    setRows(dbService.getRows());
    setView('list');
    setEditingRow(undefined);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      dbService.deleteRow(id);
      setRows(dbService.getRows());
    }
  };

  const handleExport = () => {
    dbService.exportToExcel(rows);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imported = await dbService.importFromExcel(file);
        imported.forEach(row => dbService.saveRow(row));
        setRows(dbService.getRows());
        setShowImport(false);
        alert('Import berhasil!');
      } catch (err) {
        alert('Error importing file. Pastikan format file sesuai.');
      }
    }
  };

  const handleImportRefWarga = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imported = await dbService.importFromExcel(file);
        await dbService.saveRefWarga(imported);
        setShowImport(false);
        alert(`✅ BERHASIL\nMengimpor ${imported.length} data referensi Warga!`);
      } catch (err: any) {
        alert('❌ ERROR\n' + (err.message || 'Terjadi kesalahan saat mengimpor file. Pastikan format kolom sesuai.'));
      }
    }
  };

  const handleImportRefSppt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imported = await dbService.importFromExcel(file);
        await dbService.saveRefSppt(imported);
        setShowImport(false);
        alert(`✅ BERHASIL\nMengimpor ${imported.length} data referensi SPPT!`);
      } catch (err: any) {
        alert('❌ ERROR\n' + (err.message || 'Terjadi kesalahan saat mengimpor file. Pastikan format kolom sesuai.'));
      }
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 hidden md:flex shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
            P
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">PTSL Master</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">v2.4 Offline</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setView('list')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 font-semibold transition-colors ${view === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => { setEditingRow(undefined); setView('form'); }}
            className={`w-full p-3 rounded-xl flex items-center gap-3 font-semibold transition-colors ${view === 'form' && !editingRow ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <PlusCircle size={20} />
            Input Data Baru
          </button>
          <button 
            onClick={handleExport}
            className="w-full p-3 text-slate-500 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={20} />
            Export Laporan
          </button>

          {currentUserRole === 'admin' && (
            <>
              <button 
                onClick={() => setView('users')}
                className={`w-full p-3 rounded-xl flex items-center gap-3 font-semibold transition-colors ${view === 'users' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Users size={20} />
                Manajemen Pengguna
              </button>
              <button 
                onClick={() => setView('master')}
                className={`w-full p-3 rounded-xl flex items-center gap-3 font-semibold transition-colors ${view === 'master' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Database size={20} />
                Data Master (Referensi)
              </button>
            </>
          )}
        </nav>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-200">
               {currentUser[0].toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
               <span className="text-xs font-bold text-slate-800 truncate">{currentUser}</span>
               <span className="text-[9px] text-slate-400 font-bold uppercase">{currentUserRole === 'admin' ? 'Administrator' : 'Operator'}</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-3 transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            <span className="text-sm font-bold">Keluar</span>
          </button>
        </div>

        <div className="mt-auto p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Database Ready</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium truncate">Offline LocalStorage</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex justify-between items-center px-8 py-6 bg-white/80 backdrop-blur-md border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {view === 'list' ? 'Database PTSL Desa Wongsorejo' : view === 'users' ? 'Manajemen Pengguna' : view === 'master' ? 'Manajemen Data Referensi' : editingRow ? 'Update Data' : 'Form Input Baru'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">Manajemen Data Pendaftaran Tanah Sistematis Lengkap.</p>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={() => setShowHelp(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50">
          {view === 'list' ? (
            <div className="p-8">
              <PTSLList 
                rows={rows}
                onAdd={() => {
                  setEditingRow(undefined);
                  setView('form');
                }}
                onEdit={(row) => {
                  setEditingRow(row);
                  setView('form');
                }}
                onDelete={handleDelete}
                onExport={handleExport}
              />
            </div>
          ) : view === 'users' && currentUserRole === 'admin' ? (
            <UserManagement />
          ) : view === 'master' && currentUserRole === 'admin' ? (
            <MasterDataManagement />
          ) : view === 'form' ? (
            <div className="max-w-6xl mx-auto p-8">
              <PTSLForm 
                initialData={editingRow}
                onSave={handleSave}
                onCancel={() => {
                  setView('list');
                  setEditingRow(undefined);
                }}
              />
            </div>
          ) : null}
        </div>

        {/* Floating Import Action in List View */}
        {view === 'list' && currentUserRole === 'admin' && (
          <div className="fixed bottom-8 right-8 flex flex-col items-end gap-2 z-40">
            {showImport && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl mb-4 animate-in slide-in-from-bottom-4 w-[320px]">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pusat Data (Excel)</h4>
                  <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-800">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase">1. Import Database PTSL Utama</p>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={handleImport}
                      className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-indigo-600 file:text-white cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-indigo-600 mb-2 uppercase">2. Input Database Ref Warga (NIK)</p>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={handleImportRefWarga}
                      className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-orange-600 mb-2 uppercase">3. Input Database Ref SPPT (NOP)</p>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={handleImportRefSppt}
                      className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-orange-50 file:text-orange-600 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-indigo-700 uppercase flex items-center gap-1.5">
                        <Link size={10} />
                        Konfigurasi Google Sheets:
                      </p>
                      <button 
                        onClick={() => alert('CARA SINKRONISASI:\n1. Buka Google Sheet Anda\n2. Klik tombol "Share" (Bagikan) di pojok kanan atas\n3. Ubah akses dari "Restricted" menjadi "Anyone with the link" (Siapa saja yang memiliki link)\n4. Copy URL atau ID Sheet dan tempel di sini.')}
                        className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                      >
                        <HelpCircle size={10} />
                        CARA PAKAI
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Database Utama (ID/URL):</label>
                        <div className="flex gap-1.5">
                          <input 
                            type="text"
                            value={gsheetIdUtama}
                            onChange={(e) => setGsheetIdUtama(e.target.value)}
                            placeholder="Paste ID atau Link Sheet..."
                            className="flex-1 text-[10px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-rose-500 font-mono"
                          />
                          <button 
                            onClick={() => handleSyncGSheet('UTAMA')}
                            disabled={isSyncing}
                            className="px-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors"
                          >
                            {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Database Warga (ID/URL):</label>
                        <div className="flex gap-1.5">
                          <input 
                            type="text"
                            value={gsheetIdWarga}
                            onChange={(e) => setGsheetIdWarga(e.target.value)}
                            placeholder="Paste ID atau Link Sheet..."
                            className="flex-1 text-[10px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                          />
                          <button 
                            onClick={() => handleSyncGSheet('WARGA')}
                            disabled={isSyncing}
                            className="px-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Database SPPT (ID/URL):</label>
                        <div className="flex gap-1.5">
                          <input 
                            type="text"
                            value={gsheetIdSppt}
                            onChange={(e) => setGsheetIdSppt(e.target.value)}
                            placeholder="Paste ID atau Link Sheet..."
                            className="flex-1 text-[10px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-mono"
                          />
                          <button 
                            onClick={() => handleSyncGSheet('SPPT')}
                            disabled={isSyncing}
                            className="px-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                          >
                            {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 italic">
                      *Sheet pertama (Sheet1) akan digunakan sebagai database.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-[10px] font-bold text-slate-800 mb-2 uppercase">Pengaturan Memori:</p>
                    <div className="grid grid-cols-2 gap-2">
                       <button 
                        onClick={async () => {
                          if(confirm('Hapus semua data referensi Warga?')) {
                            await dbService.clearRefData('WARGA');
                            alert('Data Warga dibersihkan');
                          }
                        }}
                        className="text-[9px] font-bold py-2 bg-rose-50 hover:bg-rose-100 rounded text-rose-600 transition-colors uppercase"
                      >
                        Hapus Ref Warga
                      </button>
                      <button 
                        onClick={async () => {
                          if(confirm('Hapus semua data referensi SPPT?')) {
                            await dbService.clearRefData('SPPT');
                            alert('Data SPPT dibersihkan');
                          }
                        }}
                        className="text-[9px] font-bold py-2 bg-rose-50 hover:bg-rose-100 rounded text-rose-600 transition-colors uppercase"
                      >
                        Hapus Ref SPPT
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium italic mt-2">
                      *Gunakan ini jika memori penuh saat import data baru.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-[10px] font-bold text-slate-800 mb-2 uppercase">Unduh Template Excel:</p>
                    <div className="grid grid-cols-1 gap-2">
                      <button 
                        onClick={() => dbService.downloadTemplate('PTSL')}
                        className="text-[9px] font-bold py-1 px-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors uppercase text-left"
                      >
                        ↓ Template PTSL Utama
                      </button>
                      <button 
                        onClick={() => dbService.downloadTemplate('WARGA')}
                        className="text-[9px] font-bold py-1 px-2 bg-indigo-50 hover:bg-indigo-100 rounded text-indigo-700 transition-colors uppercase text-left"
                      >
                        ↓ Template Referensi Warga
                      </button>
                      <button 
                        onClick={() => dbService.downloadTemplate('SPPT')}
                        className="text-[9px] font-bold py-1 px-2 bg-orange-50 hover:bg-orange-100 rounded text-orange-700 transition-colors uppercase text-left"
                      >
                        ↓ Template Referensi SPPT
                      </button>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-400 font-medium italic mt-4">
                    *Gunakan file Excel dengan header yang sesuai (NIK, NAMA, NOP, dll)
                  </p>
                </div>
              </div>
            )}
            <button 
              onClick={() => setShowImport(!showImport)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl flex items-center gap-3 font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
            >
              <Database size={18} />
              Import Data
            </button>
          </div>
        )}
      </main>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
            <button 
              onClick={() => setShowHelp(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
            >
              <X size={24} />
            </button>
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
              <HelpCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Panduan Sistem</h3>
            <p className="text-slate-500 mb-6 leading-relaxed">
              Selamat datang di PTSL Master! Sistem ini bekerja sepenuhnya secara offline menggunakan penyimpanan browser Anda.
            </p>
            <div className="space-y-4 font-semibold text-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                Data tersimpan otomatis di browser ini.
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                Export file Excel secara berkala untuk cadangan.
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                Pembersihan cache browser akan menghapus data.
              </div>
            </div>
            <button 
              onClick={() => setShowHelp(false)}
              className="w-full mt-8 py-3 bg-slate-100 rounded-2xl font-bold text-slate-800 hover:bg-slate-200 transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
