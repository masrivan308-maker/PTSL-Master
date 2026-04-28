import React, { useState, useEffect } from 'react';
import { dbService } from './dbService';
import { PTSLData } from './types';
import { PTSLList } from './components/PTSLList';
import { PTSLForm } from './components/PTSLForm';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { MasterDataManagement } from './components/MasterDataManagement';
import { Upload, HelpCircle, X, LayoutDashboard, FileSpreadsheet, PlusCircle, Database, LogOut, User, RefreshCw, Link, Users } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

type View = 'list' | 'form' | 'users' | 'master';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [rows, setRows] = useState<PTSLData[]>([]);
  const [editingRow, setEditingRow] = useState<PTSLData | undefined>();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch role from Firestore
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const role = userDoc.exists() ? userDoc.data().role : 'operator';
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email,
            role: role
          });
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email,
            role: 'operator'
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = dbService.listenPTSL((data) => {
        setRows(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch(e) {
      console.error(e);
    }
  };

  const handleSave = async (data: PTSLData) => {
    await dbService.saveRow(data);
    setView('list');
    setEditingRow(undefined);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      await dbService.deleteRow(id);
    }
  };

  const handleEdit = (row: PTSLData) => {
    setEditingRow(row);
    setView('form');
  };

  const handleExport = () => {
    dbService.exportToExcel(rows);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-indigo-600" size={48} />
          <p className="text-slate-500 font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 shrink-0">
        <div className="p-8 border-b border-slate-100 shrink-0">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-6">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Sistem PTSL</h1>
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest mt-2">{user?.role === 'admin' ? 'Administrator' : 'Operator'}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => { setView('list'); setEditingRow(undefined); }}
            className={`w-full p-3 rounded-xl flex items-center gap-3 font-semibold transition-colors ${view === 'list' && !editingRow ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Database size={20} />
            Data Pemohon
          </button>
          
          <button 
            onClick={() => { setView('form'); setEditingRow(undefined); }}
            className={`w-full p-3 rounded-xl flex items-center gap-3 font-semibold transition-colors ${view === 'form' && !editingRow ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <PlusCircle size={20} />
            Input Data Baru
          </button>

          <button 
            onClick={handleExport}
            className="w-full p-3 rounded-xl flex items-center gap-3 font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet size={20} />
            Export Laporan
          </button>

          <button 
            onClick={() => setView('master')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 font-semibold transition-colors ${view === 'master' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Database size={20} />
            Data Master (Referensi)
          </button>

          {user?.role === 'admin' && (
            <>
              <button 
                onClick={() => setView('users')}
                className={`w-full p-3 rounded-xl flex items-center gap-3 font-semibold transition-colors ${view === 'users' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Users size={20} />
                Manajemen Pengguna
              </button>
            </>
          )}
        </nav>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-4">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0">
               <User size={18} />
            </div>
            <div className="flex flex-col min-w-0">
               <span className="text-xs font-bold text-slate-800 truncate">{user?.displayName}</span>
               <span className="text-[9px] text-slate-400 font-bold uppercase">{user?.role === 'admin' ? 'Administrator' : 'Operator'}</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center justify-between p-4 text-rose-600 hover:bg-rose-50 transition-colors mx-2 rounded-xl mb-4 font-bold text-sm"
          >
            <span>Log out</span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

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
              title="Panduan Sinkronisasi"
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50/50">
          {view === 'list' ? (
            <div className="p-8">
              <PTSLList 
                rows={rows} 
                onAdd={() => { setView('form'); setEditingRow(undefined); }}
                onEdit={handleEdit} 
                onDelete={handleDelete}
                onExport={handleExport}
              />
            </div>
          ) : view === 'users' && user?.role === 'admin' ? (
            <UserManagement />
          ) : view === 'master' ? (
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

        {/* Floating Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
              <button 
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1"
              >
                <X size={20} />
              </button>
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <LayoutDashboard className="text-indigo-600" />
                Sistem Terhubung Cloud
              </h3>
              <div className="space-y-4 text-sm text-slate-600">
                <p>Aplikasi ini sekarang menggunakan database Cloud (Firebase) dan seluruh sinkronisasi berjalan otomatis secara real-time antar perangkat.</p>
                
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest pt-2">Manajemen Data Warga & SPPT</h4>
                <p>Khusus role Admin dapat mengakses "Data Master" di sidebar untuk menambahkan, mengubah, atau menghapus referensi data Warga (NIK dsb) dan data SPPT. Perubahan ini akan langsung tersedia untuk semua Operator di semua perangkat.</p>
                
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest pt-2">Login Google</h4>
                <p>Semua pengguna dapat masuk ke aplikasi secara instan dengan akun Google yang mereka miliki. Role pengguna dapat diatur oleh Admin melalui panel Manajemen Pengguna.</p>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full mt-6 bg-slate-100 text-slate-800 font-bold py-3 rounded-xl hover:bg-slate-200 transition"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
