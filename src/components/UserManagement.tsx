import React, { useState, useEffect } from 'react';
import { dbService } from '../dbService';
import { User, ShieldCheck, Trash2, Edit2, UserPlus, X, KeySquare } from 'lucide-react';
import { motion } from 'motion/react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(dbService.getUsers());
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setRole('operator');
    setEditingUser(null);
  };

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setPassword(user.password);
      setRole(user.role);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      alert('Username dan Password wajib diisi');
      return;
    }

    try {
      if (editingUser) {
        if (editingUser.username === 'admin' && username !== 'admin') {
           alert('Username akun admin master tidak dapat diubah.');
           return;
        }
        dbService.updateUser(editingUser.username, { username, password, role });
        alert('User berhasil diupdate');
      } else {
        dbService.registerUser(username, password, role);
        alert('User berhasil ditambahkan');
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    }
  };

  const handleDelete = (userToDelete: string) => {
    if (userToDelete === 'admin') {
      alert('Akun admin master tidak dapat dihapus');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus user: ${userToDelete}?`)) {
      dbService.deleteUser(userToDelete);
      loadUsers();
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h2>
          <p className="text-sm text-slate-500">Kelola akses dan kata sandi untuk setiap operator/admin</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-indigo-700 transition"
        >
          <UserPlus size={18} />
          Tambah User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="p-4 pl-6">Username</th>
              <th className="p-4">Password</th>
              <th className="p-4">Role / Hak Akses</th>
              <th className="p-4 text-right pr-6">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="p-4 pl-6 font-bold text-slate-800 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'admin' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {u.username[0].toUpperCase()}
                  </div>
                  {u.username}
                </td>
                <td className="p-4 text-sm text-slate-500 font-mono">
                  {/* Masking password partially visually if needed, but it's simpler to just show it for admin or keep it masked */}
                  {u.password.substring(0, 2)}••••••
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
                      title="Edit Pengguna"
                    >
                      <Edit2 size={16} />
                    </button>
                    {u.username !== 'admin' && (
                      <button 
                        onClick={() => handleDelete(u.username)}
                        className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Pengguna"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-slate-500">
                  Belum ada data user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {editingUser ? <Edit2 size={18} className="text-indigo-600" /> : <UserPlus size={18} className="text-indigo-600" />}
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-800">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={editingUser?.username === 'admin'}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                    placeholder="Masukkan username..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <KeySquare size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Masukkan password..."
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
                    disabled={editingUser?.username === 'admin'}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 appearance-none"
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
                  Simpan
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
