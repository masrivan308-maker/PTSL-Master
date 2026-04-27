export interface MasterWarga {
  NIK: string;
  NAMA: string;
  TEMPAT_LAHIR: string;
  TANGGAL_LAHIR: string;
  ALAMAT: string;
  RT_RW: string;
  KEL_DESA: string;
  KECAMATAN: string;
  PEKERJAAN: string;
  NO_HP: string;
}

/**
 * TEMPAT MENYIMPAN DATA WARGA BAKU (PEMAS DARI EXCEL)
 * Anda bisa menambahkan ribuan data di sini.
 */
export const MASTER_WARGA_DATA: MasterWarga[] = [
  {
    NIK: "3510010101010001",
    NAMA: "CONTOH WARGA TETAP 1",
    TEMPAT_LAHIR: "BANYUWANGI",
    TANGGAL_LAHIR: "01-01-1980",
    ALAMAT: "DUSUN KRAJAN",
    RT_RW: "01/01",
    KEL_DESA: "WONGSOREJO",
    KECAMATAN: "WONGSOREJO",
    PEKERJAAN: "PETANI",
    NO_HP: "08123456789"
  },
  {
    NIK: "3510010101010002",
    NAMA: "CONTOH WARGA TETAP 2",
    TEMPAT_LAHIR: "BANYUWANGI",
    TANGGAL_LAHIR: "02-02-1985",
    ALAMAT: "DUSUN BENDRONG",
    RT_RW: "02/01",
    KEL_DESA: "WONGSOREJO",
    KECAMATAN: "WONGSOREJO",
    PEKERJAAN: "WIRASWASTA",
    NO_HP: "08123456780"
  }
  // Silakan masukkan ribuan data lainnya di bawah ini...
];
