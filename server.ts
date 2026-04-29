import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Papa from "papaparse";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore();
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Admin Proxy Sync
app.post("/api/master/sync-url", async (req, res) => {
  const { url, type } = req.body;
  if (!url || !type) {
    return res.status(400).json({ status: "error", message: "URL dan tipe data diperlukan." });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gagal mengambil data: ${response.statusText}`);
    
    const csvText = await response.text();
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    if (result.errors && result.errors.length > 0 && result.data.length === 0) {
      throw new Error(`Gagal parsing CSV: ${result.errors[0].message}`);
    }

    const collectionName = type === 'WARGA' ? 'master_warga' : 'master_sppt';
    const keyField = type === 'WARGA' ? 'NIK' : 'NOP';

    // Transform and Clean
    const cleanedData = result.data.map((item: any) => {
      const newItem: any = { updatedAt: FieldValue.serverTimestamp() };
      if (type === 'WARGA') {
        const nik = String(item['NIK'] || item['noKtp'] || '');
        if (!nik) return null;
        newItem.NIK = nik;
        newItem.NAMA = item['NAMA'] || item['nama'] || '-';
        newItem.ALAMAT = item['ALAMAT'] || item['alamat'] || '-';
        newItem.KEL_DESA = item['KEL/DESA'] || item['kelDesa'] || '-';
      } else {
        const nop = String(item['NOP'] || item['nopSppt'] || '');
        if (!nop) return null;
        newItem.NOP = nop;
        newItem.NAMA_WAJIB_PAJAK = item['NAMA WAJIB PAJAK'] || item['namaWajibPajak'] || '-';
        newItem.LUAS_SPPT = Number(item['LUAS SPPT'] || item['luasSppt'] || 0);
        newItem.NJOP_PERMETER = Number(item['NJOP PERMETER'] || item['njopPermeter'] || 0);
        newItem.DUSUN = item['DUSUN'] || '-';
        newItem.BLOK = item['BLOK'] || '-';
        newItem.RT = String(item['RT'] || '-');
        newItem.RW = String(item['RW'] || '-');
        newItem.DESA = item['DESA'] || '-';
        newItem.KECAMATAN = item['KECAMATAN'] || '-';
      }
      return newItem;
    }).filter(Boolean);

    // Write to Firestore in batches
    const batchSize = 500;
    for (let i = 0; i < cleanedData.length; i += batchSize) {
      const batch = db.batch();
      const chunk = cleanedData.slice(i, i + batchSize);
      chunk.forEach((item: any) => {
        const docRef = db.collection(collectionName).doc(item[keyField]);
        batch.set(docRef, item);
      });
      await batch.commit();
    }

    res.json({ 
      status: "ok", 
      message: `Berhasil sinkronisasi ${cleanedData.length} data ke Firestore dari Google Sheets.`,
      count: cleanedData.length 
    });
  } catch (error: any) {
    console.error("Sync URL error:", error);
    res.status(500).json({ status: "error", message: error.message || "Terjadi kesalahan server saat sinkronisasi." });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
