import React, { useState } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface Props {
  onLogin: (user: any) => void;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in our Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      let role = 'operator';
      if (user.email === 'masrivan308@gmail.com') {
        role = 'admin';
      }

      if (userDoc.exists()) {
        const existingRole = userDoc.data().role || 'operator';
        // Only update if it's the admin email and not already admin
        if (user.email === 'masrivan308@gmail.com' && existingRole !== 'admin') {
          role = 'admin';
          await setDoc(userDocRef, { role: 'admin' }, { merge: true });
        } else {
          role = existingRole;
        }
      } else {
        // Create new user profile
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName,
          role: role,
          createdAt: new Date().toISOString()
        });
      }

      onLogin({
        uid: user.uid,
        username: user.displayName || user.email,
        role,
      });

    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log('Login dibatalkan oleh pengguna.');
      } else {
        alert('❌ LOGIN GAGAL\n' + error.message);
      }
    } finally {
      setIsLoading(false);
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
                Silakan masuk dengan akun Google
              </p>
            </div>
          </div>

          <div className="p-10 space-y-6">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white text-slate-700 border border-slate-200 rounded-2xl py-4 font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>{isLoading ? 'Memuat...' : 'Login dengan Google'}</span>
            </button>

            <div className="pt-4 text-center">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Aplikasi Pendaftaran Tanah Sistematis Lengkap</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

