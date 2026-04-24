import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PTSLSchema, PTSLData, DEFAULT_VALUES } from '../types';
import { ChevronRight, ChevronLeft, Save, X, User, MapPin, History, ShieldCheck, FileText, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../dbService';

interface Props {
  initialData?: PTSLData;
  onSave: (data: PTSLData) => void;
  onCancel: () => void;
}

const SECTIONS = [
  { id: 'identity', title: 'Identitas Pemohon', icon: <User size={16} />, color: 'indigo' },
  { id: 'sppt', title: 'Objek Pajak / SPPT', icon: <FileText size={16} />, color: 'orange' },
  { id: 'location', title: 'Lokasi & Objek', icon: <MapPin size={16} />, color: 'emerald' },
  { id: 'history', title: 'Riwayat Tanah', icon: <History size={16} />, color: 'rose' },
  { id: 'boundaries', title: 'Batas & Saksi', icon: <ShieldCheck size={16} />, color: 'amber' },
  { id: 'admin', title: 'Administratif', icon: <Save size={16} />, color: 'slate' },
];

export const PTSLForm: React.FC<Props> = ({ initialData, onSave, onCancel }) => {
  const [activeSection, setActiveSection] = useState(0);
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<PTSLData>({
    resolver: zodResolver(PTSLSchema),
    defaultValues: (initialData || DEFAULT_VALUES) as any,
  });

  const nikValue = watch('noKtp');
  const nopValue = watch('nopSppt');
  const nikSaksi1 = watch('nikSaksi1');
  const nikSaksi2 = watch('nikSaksi2');

  const handleLookupWarga = () => {
    console.log('Searching NIK:', nikValue);
    if (!nikValue) {
      alert('⚠️ PERINGATAN\nSilakan masukkan NIK terlebih dahulu.');
      return;
    }
    const refData = dbService.getRefWarga();
    const found = refData.find(v => 
      String(v.NIK || v['NO KTP'] || v.noKtp || '').includes(nikValue)
    );

    if (found) {
      setValue('nama', found.NAMA || found.nama || '');
      setValue('tempatLahir', found['TEMPAT LAHIR'] || found.tempatLahir || '');
      setValue('tanggalLahir', found['TANGGAL LAHIR'] || found.tanggalLahir || '');
      setValue('alamat', found.ALAMAT || found.alamat || '');
      setValue('rtRw', found['RT/RW'] || found.rtRw || '');
      setValue('kelDesa', found['KEL/DESA'] || found.kelDesa || '');
      setValue('kecamatan', found.KECAMATAN || found.kecamatan || '');
      setValue('pekerjaan', found.PEKERJAAN || found.pekerjaan || '');
      setValue('noHp', found['NO HP'] || found.noHp || '');
      alert('✅ DATA DITEMUKAN\nIdentitas pemohon telah diisi otomatis.');
    } else {
      alert('❌ DATA TIDAK DITEMUKAN\nNIK: ' + nikValue + ' tidak ada dalam database referensi.');
    }
  };

  const handleLookupSppt = () => {
    if (!nopValue) {
      alert('⚠️ PERINGATAN\nSilakan masukkan NOP terlebih dahulu.');
      return;
    }
    const refData = dbService.getRefSppt();
    const found = refData.find(v => 
      String(v.NOP || v['NOP SPPT'] || v.nopSppt || '').includes(nopValue)
    );

    if (found) {
      setValue('namaWajibPajak', found['NAMA WAJIB PAJAK'] || found.namaWajibPajak || '');
      setValue('luasSppt', String(found['LUAS SPPT'] || found.luasSppt || '0'));
      setValue('njopPermeter', String(found['NJOP PERMETER'] || found.njopPermeter || '0'));
      alert('✅ DATA SPPT DITEMUKAN\nInformasi objek pajak telah diisi otomatis.');
    } else {
      alert('❌ DATA TIDAK DITEMUKAN\nNOP: ' + nopValue + ' tidak ada dalam database referensi.');
    }
  };

  const handleLookupSaksi = (nik: string, saksiNum: 1 | 2) => {
    if (!nik) return alert('Masukkan NIK Saksi terlebih dahulu');
    const refData = dbService.getRefWarga();
    const found = refData.find(v => 
      String(v.NIK || v['NO KTP'] || v.noKtp || '').includes(nik)
    );

    if (found) {
      const prefix = saksiNum === 1 ? 'Saksi1' : 'Saksi2';
      if (found.NAMA || found.nama) setValue(`nama${prefix}` as any, found.NAMA || found.nama);
      if (found.PEKERJAAN || found.pekerjaan) setValue(`pekerjaan${prefix}` as any, found.PEKERJAAN || found.pekerjaan);
      if (found.ALAMAT || found.alamat) setValue(`alamat${prefix}` as any, found.ALAMAT || found.alamat);
      alert(`Data Saksi ${saksiNum} ditemukan!`);
    } else {
      alert(`⚠️ DATA TIDAK DITEMUKAN\nNIK Saksi ${saksiNum} tidak terdaftar dalam database referensi warga.`);
    }
  };

  const onSubmit = (data: PTSLData) => {
    onSave({ ...data, id: initialData?.id });
  };

  const next = () => setActiveSection(s => Math.min(s + 1, SECTIONS.length - 1));
  const prev = () => setActiveSection(s => Math.max(s - 1, 0));

  const renderField = (name: keyof PTSLData, label: string, type: string = 'text', options?: string[]) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
        {label}
      </label>
      {type === 'select' ? (
        <select
          {...register(name as any)}
          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
        >
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          {...register(name as any)}
          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
        />
      )}
      {errors[name] && (
        <span className="text-[10px] text-rose-500 font-bold italic mt-0.5">
          {errors[name]?.message as string}
        </span>
      )}
    </div>
  );

  const currentSection = SECTIONS[activeSection];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full bg-${currentSection.color}-500 animate-pulse`}></span>
              <span className={`text-[10px] font-bold text-${currentSection.color}-600 uppercase tracking-widest`}>
                Langkah {activeSection + 1} dari {SECTIONS.length}
              </span>
           </div>
           <h2 className="text-3xl font-bold tracking-tight text-slate-800">
             {initialData ? 'Perbarui Data PTSL' : 'Pendaftaran Objek Baru'}
           </h2>
        </div>
        <button 
          onClick={onCancel} 
          className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
        >
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-2">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(i)}
              className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all text-left border ${
                activeSection === i 
                  ? 'bg-white border-indigo-200 shadow-lg shadow-indigo-50/50' 
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                 activeSection === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {s.icon}
              </div>
              <div className="flex flex-col">
                 <span className={`text-[10px] font-bold uppercase tracking-tight ${activeSection === i ? 'text-indigo-600' : ''}`}>Bagian {i + 1}</span>
                 <span className={`text-xs font-bold leading-tight ${activeSection === i ? 'text-slate-800' : ''}`}>{s.title}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Form Area */}
        <div className="md:col-span-3">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[500px] flex flex-col">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-8">
                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-${currentSection.color}-100 text-${currentSection.color}-600`}>
                    {currentSection.icon}
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-800">{currentSection.title}</h3>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">Silakan lengkapi informasi yang diperlukan.</p>
                 </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5"
                >
                  {activeSection === 0 && (
                    <>
                      <div className="col-span-2 grid grid-cols-2 gap-5">
                        {renderField('nib', 'NIB')}
                        {renderField('luas', 'LUAS (M2)')}
                      </div>
                      <div className="flex flex-col gap-1 relative">
                        {renderField('noKtp', 'NOMOR KTP (NIK)')}
                        <button 
                          type="button"
                          onClick={handleLookupWarga}
                          className="absolute right-2 top-[22px] p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors z-10"
                          title="Cari di Database Warga"
                        >
                          <Search size={14} />
                        </button>
                      </div>
                      {renderField('nama', 'NAMA LENGKAP')}
                      {renderField('tempatLahir', 'TEMPAT LAHIR')}
                      {renderField('tanggalLahir', 'TANGGAL LAHIR', 'date')}
                      {renderField('pekerjaan', 'PEKERJAAN')}
                      {renderField('noHp', 'NOMOR HANDPHONE')}
                      <div className="md:col-span-2">
                        {renderField('alamat', 'ALAMAT LENGKAP')}
                      </div>
                      <div className="col-span-2 grid grid-cols-3 gap-5">
                        {renderField('rtRw', 'RT/RW')}
                        {renderField('kelDesa', 'KELURAHAN / DESA')}
                        {renderField('kecamatan', 'KECAMATAN')}
                      </div>
                    </>
                  )}

                  {activeSection === 1 && (
                    <>
                      <div className="col-span-2 grid grid-cols-2 gap-5">
                        <div className="flex flex-col gap-1 relative">
                          {renderField('nopSppt', 'NOP SPPT')}
                          <button 
                            type="button"
                            onClick={handleLookupSppt}
                            className="absolute right-2 top-[22px] p-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors z-10"
                            title="Cari di Database SPPT"
                          >
                            <Search size={14} />
                          </button>
                        </div>
                        {renderField('namaWajibPajak', 'NAMA WAJIB PAJAK')}
                      </div>
                      {renderField('luasSppt', 'LUAS SPPT (M2)')}
                      {renderField('njopPermeter', 'NJOP PER METER')}
                    </>
                  )}

                  {activeSection === 2 && (
                    <>
                      {renderField('dusunJalanGang', 'DUSUN / JALAN / GANG')}
                      {renderField('blok', 'BLOK / TANAH')}
                      <div className="grid grid-cols-2 gap-5">
                        {renderField('rt', 'RT')}
                        {renderField('rw', 'RW')}
                      </div>
                      {renderField('desa', 'DESA')}
                      {renderField('kecamatanLokasi', 'KECAMATAN LOKASI')}
                    </>
                  )}

                  {activeSection === 3 && (
                    <>
                      {renderField('luasDimohon', 'LUAS DIMOHON')}
                      {renderField('diperolehMelalui', 'DIPEROLEH MELALUI', 'select', ['Jual Beli', 'Waris', 'Hibah', 'Tukar Menukar', 'Pemberian Hak'])}
                      {renderField('buktiPerolehan', 'BUKTI PEROLEHAN')}
                      {renderField('pemilikKe1Petok', 'PEMILIK KE-1')}
                      {renderField('pemilikKe2', 'PEMILIK KE-2')}
                      {renderField('pemilikKe3Pemohon', 'PEMILIK KE-3 (PEMOHON)')}
                      <div className="grid grid-cols-2 gap-5">
                        {renderField('tahunDimilikiPihakKe1', 'TAHUN PEMILIK 1')}
                        {renderField('tahunDimilikiPihakKe3', 'TAHUN PEMILIK 3')}
                      </div>
                      <div className="grid grid-cols-3 gap-5">
                        {renderField('petokC', 'PETOK C')}
                        {renderField('noPersil', 'NO PERSIL')}
                        {renderField('kelas', 'KELAS')}
                      </div>
                      {renderField('luas3', 'LUAS (RIWAYAT)')}
                      {renderField('pertanianNonPertanian', 'JENIS TANAH', 'select', ['Pertanian', 'Non Pertanian'])}
                    </>
                  )}

                  {activeSection === 4 && (
                    <>
                      <div className="md:col-span-2 border-b border-slate-100 mb-2 pb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Batas-batas Tanah</span>
                      </div>
                      {renderField('utara', 'BATAS UTARA')}
                      {renderField('timur', 'BATAS TIMUR')}
                      {renderField('selatan', 'BATAS SELATAN')}
                      {renderField('barat', 'BATAS BARAT')}
                      
                      <div className="md:col-span-2 border-b border-slate-100 mt-4 mb-2 pb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Saksi-Saksi</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                         <h4 className="text-xs font-bold text-slate-700 mb-4 flex justify-between items-center">
                            Saksi 1
                            <button 
                              type="button"
                              onClick={() => handleLookupSaksi(nikSaksi1, 1)}
                              className="p-1 px-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 text-[10px]"
                            >
                              <Search size={10} /> Cari NIK
                            </button>
                         </h4>
                         <div className="grid gap-4">
                           {renderField('nikSaksi1', 'NIK SAKSI 1')}
                           {renderField('namaSaksi1', 'NAMA SAKSI 1')}
                           {renderField('pekerjaanSaksi1', 'PEKERJAAN SAKSI 1')}
                           {renderField('alamatSaksi1', 'ALAMAT SAKSI 1')}
                         </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                         <h4 className="text-xs font-bold text-slate-700 mb-4 flex justify-between items-center">
                            Saksi 2
                            <button 
                              type="button"
                              onClick={() => handleLookupSaksi(nikSaksi2, 2)}
                              className="p-1 px-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 text-[10px]"
                            >
                              <Search size={10} /> Cari NIK
                            </button>
                         </h4>
                         <div className="grid gap-4">
                           {renderField('nikSaksi2', 'NIK SAKSI 2')}
                           {renderField('namaSaksi2', 'NAMA SAKSI 2')}
                           {renderField('pekerjaanSaksi2', 'PEKERJAAN SAKSI 2')}
                           {renderField('alamatSaksi2', 'ALAMAT SAKSI 2')}
                         </div>
                      </div>
                    </>
                  )}

                  {activeSection === 5 && (
                    <>
                      {renderField('namaKades', 'NAMA KEPALA DESA')}
                      {renderField('noAkteTanah', 'NOMOR AKTE TANAH')}
                      <div className="col-span-2">
                        {renderField('keteranganTanah', 'KETERANGAN TAMBAHAN')}
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex justify-between items-center pt-8 border-t border-slate-100 mt-12 overflow-hidden">
              <button
                type="button"
                onClick={prev}
                disabled={activeSection === 0}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft size={20} />
                <span>Sebelumnya</span>
              </button>
              
              {activeSection === SECTIONS.length - 1 ? (
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-105"
                >
                  <Save size={20} />
                  <span>Simpan ke Database</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-indigo-600 rounded-2xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-all"
                >
                  <span>Berikutnya</span>
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
