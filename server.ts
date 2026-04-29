import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Papa from "papaparse";

const app = express();
const PORT = 3000;

let wargaData: any[] = [];
let spptData: any[] = [];
let isDataLoaded = true;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Upload endpoints
app.post("/api/master/warga/upload", (req, res) => {
  if (req.body && Array.isArray(req.body.data)) {
    if (req.body.append) {
      wargaData.push(...req.body.data);
    } else {
      wargaData = req.body.data;
    }
    isDataLoaded = true;
    res.json({ status: "ok", message: `Berhasil mengunggah ${req.body.data.length} data. Total: ${wargaData.length}` });
  } else {
    res.status(400).json({ status: "error", message: "Format data tidak valid" });
  }
});

app.post("/api/master/sppt/upload", (req, res) => {
  if (req.body && Array.isArray(req.body.data)) {
    if (req.body.append) {
      spptData.push(...req.body.data);
    } else {
      spptData = req.body.data;
    }
    isDataLoaded = true;
    res.json({ status: "ok", message: `Berhasil mengunggah ${req.body.data.length} data. Total: ${spptData.length}` });
  } else {
    res.status(400).json({ status: "error", message: "Format data tidak valid" });
  }
});

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

    if (type === 'WARGA') {
      wargaData = result.data;
    } else if (type === 'SPPT') {
      spptData = result.data;
    }

    isDataLoaded = true;
    res.json({ 
      status: "ok", 
      message: `Berhasil sinkronisasi ${result.data.length} data dari Google Sheets.`,
      count: result.data.length 
    });
  } catch (error: any) {
    console.error("Sync URL error:", error);
    res.status(500).json({ status: "error", message: error.message || "Terjadi kesalahan server saat sinkronisasi." });
  }
});

app.post("/api/master/clear", (req, res) => {
  const type = req.body.type;
  if (type === 'WARGA') wargaData = [];
  else if (type === 'SPPT') spptData = [];
  else {
    wargaData = [];
    spptData = [];
  }
  res.json({ status: "ok", message: "Data master berhasil dikosongkan." });
});

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "hello-world-123" });
});

app.get("/api/master/warga", (req, res) => {
  console.log("RECEIVED REQUEST FOR /api/master/warga", req.url);
  if (!isDataLoaded) {
    return res.status(503).json({ error: "Data is still loading. Please try again in a few seconds." });
  }

  const search = (req.query.search as string || "").toLowerCase();
  const page = parseInt(req.query.page as string || "1", 10);
  const limit = parseInt(req.query.limit as string || "50", 10);

  let filtered = wargaData;
  if (search) {
    filtered = filtered.filter(item => {
      return Object.values(item).some(val => 
        String(val).toLowerCase().includes(search)
      );
    });
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  res.json({
    data: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
});

app.get("/api/master/sppt", (req, res) => {
  if (!isDataLoaded) {
    return res.status(503).json({ error: "Data is still loading. Please try again in a few seconds." });
  }

  const search = (req.query.search as string || "").toLowerCase();
  const page = parseInt(req.query.page as string || "1", 10);
  const limit = parseInt(req.query.limit as string || "50", 10);

  let filtered = spptData;
  if (search) {
    filtered = filtered.filter(item => {
      return Object.values(item).some(val => 
        String(val).toLowerCase().includes(search)
      );
    });
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  res.json({
    data: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
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
