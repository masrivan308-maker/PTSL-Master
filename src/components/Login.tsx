import React, { useState } from 'react';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { dbService } from '../dbService';

interface Props {
  onLogin: (user: any) => void;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      alert('Silakan masukkan username dan password');
      return;
    }

    const user = dbService.authenticate(username, password);
    if (user) {
      onLogin(user);
    } else {
      alert('❌ LOGIN GAGAL\nUsername atau Password salah.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 overflow-hidden border border-slate-100">
          <div className="bg-indigo-600 p-10 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
               <div className="absolute top-0 left-0 w-24 h-24 bg-white rounded-full -translate-x-12 -translate-y-12"></div>
               <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16 translate-y-16"></div>
            </div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <ShieldCheck size={32} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                SISTEM PTSL
              </h1>
              <p className="text-indigo-100 text-sm mt-1">
                Silakan masuk untuk melanjutkan
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="Nama Pengguna"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Masuk Aplikasi</span>
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="pt-4 text-center">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Aplikasi Pendaftaran Tanah Sistematis Lengkap</p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
