import React, { useState, useEffect } from 'react';
import { dbService } from '../dbService';
import { User, ShieldCheck, Trash2, Edit2, UserPlus, X, KeySquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [role, setRole] = useState('operator');

  useEffect(() => {
    const unsubscribe = dbService.listenUsers((data) => {
      setUsers(data);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (user: any) => {
    setEditingUser(user);
    setRole(user.role || 'operator');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await dbService.updateUserRole(editingUser.id, role);
        alert('Role user berhasil diupdate');
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    }
  };

  const handleDelete = async (user: any) => {
    if (confirm(`Apakah Anda yakin ingin menghapus akses untuk: ${user.email || user.displayName}?`)) {
      try {
        await dbService.deleteUser(user.id);
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h2>
          <p className="text-sm text-slate-500">Ubah hak akses atau cabut akses untuk pengguna</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="p-4 pl-6">Nama / Email</th>
              <th className="p-4">Akun Dibuat</th>
              <th className="p-4">Role / Hak Akses</th>
              <th className="p-4 text-right pr-6">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="p-4 pl-6 font-bold text-slate-800 flex items-center gap-3">
                  <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'admin' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {u.displayName ? u.displayName[0].toUpperCase() : u.email?.[0].toUpperCase()}
                  </div>
                  <div>
                     <div className="text-sm">{u.displayName || '-'}</div>
                     <div className="text-xs text-slate-400 font-normal">{u.email}</div>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-500 font-mono">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}
                </td>
                <td className="p-4 text-sm">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleOpenModal(u)}
                      className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit Hak Akses"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(u)}
                      className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus / Cabut Akses Pengguna"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-slate-500">
                  Belum ada data user. Silakan login menggunakan Google.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 size={18} className="text-indigo-600" />
                Edit Hak Akses
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-800">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pengguna</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={editingUser?.email || ''}
                    disabled
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none transition-all disabled:opacity-70"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hak Akses</label>
                <div className="relative">
                  <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                  >
                    <option value="operator">Operator (Melihat, Menambah & Edit Data)</option>
                    <option value="admin">Administrator (Akses Penuh)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

