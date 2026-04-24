import { z } from 'zod';

export const PTSLSchema = z.object({
  id: z.string().optional(),
  // Identity
  nib: z.string().min(1, 'NIB wajib diisi'),
  luas: z.string().min(1, 'Luas wajib diisi'),
  noKtp: z.string().min(1, 'No KTP wajib diisi'),
  nama: z.string().min(1, 'Nama wajib diisi'),
  tempatLahir: z.string().min(1, 'Tempat Lahir wajib diisi'),
  tanggalLahir: z.string().min(1, 'Tanggal Lahir wajib diisi'),
  alamat: z.string().min(1, 'Alamat wajib diisi'),
  rtRw: z.string(),
  kelDesa: z.string(),
  kecamatan: z.string(),
  pekerjaan: z.string(),
  noHp: z.string(),
  
  // SPPT Data
  nopSppt: z.string(),
  namaWajibPajak: z.string(),
  luasSppt: z.string(),
  njopPermeter: z.string(),
  
  // Location
  dusunJalanGang: z.string(),
  blok: z.string(),
  rt: z.string(),
  rw: z.string(),
  desa: z.string(),
  kecamatanLokasi: z.string(),
  
  // Land History
  luasDimohon: z.string(),
  diperolehMelalui: z.string(),
  buktiPerolehan: z.string(),
  pemilikKe1Petok: z.string(),
  pemilikKe2: z.string(),
  pemilikKe3Pemohon: z.string(),
  tahunDimilikiPihakKe1: z.string(),
  tahunDimilikiPihakKe3: z.string(),
  petokC: z.string(),
  noPersil: z.string(),
  kelas: z.string(),
  luas3: z.string(),
  pertanianNonPertanian: z.enum(['Pertanian', 'Non Pertanian']),
  
  // Boundaries
  utara: z.string(),
  timur: z.string(),
  selatan: z.string(),
  barat: z.string(),
  
  // Witness 1
  namaSaksi1: z.string(),
  nikSaksi1: z.string(),
  pekerjaanSaksi1: z.string(),
  alamatSaksi1: z.string(),
  
  // Witness 2
  namaSaksi2: z.string(),
  nikSaksi2: z.string(),
  pekerjaanSaksi2: z.string(),
  alamatSaksi2: z.string(),
  
  // Administrative
  namaKades: z.string(),
  keteranganTanah: z.string(),
  noAkteTanah: z.string(),
  operator: z.string().optional(),
  createdAt: z.string().optional()
});

export type PTSLData = z.infer<typeof PTSLSchema>;

export const DEFAULT_VALUES: Partial<PTSLData> = {
  pertanianNonPertanian: 'Pertanian',
  rtRw: '/',
  rt: '',
  rw: '',
  tanggalLahir: new Date().toISOString().split('T')[0],
};
