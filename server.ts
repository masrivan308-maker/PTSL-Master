import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

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
    wargaData = req.body.data;
    isDataLoaded = true;
    console.log(`Uploaded ${wargaData.length} Warga records.`);
    res.json({ status: "ok", message: `Berhasil mengunggah ${wargaData.length} data Warga.` });
  } else {
    res.status(400).json({ status: "error", message: "Invalid data format" });
  }
});

app.post("/api/master/sppt/upload", (req, res) => {
  if (req.body && Array.isArray(req.body.data)) {
    spptData = req.body.data;
    isDataLoaded = true;
    console.log(`Uploaded ${spptData.length} SPPT records.`);
    res.json({ status: "ok", message: `Berhasil mengunggah ${spptData.length} data SPPT.` });
  } else {
    res.status(400).json({ status: "error", message: "Invalid data format" });
  }
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
