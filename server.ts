import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Papa from "papaparse";

const app = express();
const PORT = 3000;

let WARGA_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8Gp1RSibavtsg7wHxzSfBJpDJVAsOgKyIPESPtfBPUAdMFP8yAQBj94lxMs9iDL1s3QECp_i9xbha/pub?output=csv";
let SPPT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQMz-UaCHwGuA8SSP2E3zN239h6kKBrxRl0RiP55Fs1NyjHWo3G6PjzduYuyhdvfDK_jVGVgzyIHPVA/pub?output=csv";

let wargaData: any[] = [];
let spptData: any[] = [];
let isDataLoaded = false;
let isReloading = false;

async function loadData() {
  if (isReloading) return;
  isReloading = true;
  try {
    console.log("Loading data from Google Sheets...");
    const [wargaRes, spptRes] = await Promise.all([
      fetch(WARGA_CSV_URL),
      fetch(SPPT_CSV_URL),
    ]);

    const wargaText = await wargaRes.text();
    const spptText = await spptRes.text();

    const wargaParsed = Papa.parse(wargaText, { header: true, dynamicTyping: true, skipEmptyLines: true });
    const spptParsed = Papa.parse(spptText, { header: true, dynamicTyping: true, skipEmptyLines: true });

    wargaData = wargaParsed.data;
    spptData = spptParsed.data;
    isDataLoaded = true;
    console.log(`Loaded ${wargaData.length} Warga records and ${spptData.length} SPPT records.`);
    return { success: true };
  } catch (error: any) {
    console.error("Error loading CSV data:", error);
    return { success: false, message: error.message };
  } finally {
    isReloading = false;
  }
}

// Start async loading
loadData();

app.use(express.json());

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

// Force reload data endpoint for admin
app.post("/api/master/reload", async (req, res) => {
  if (isReloading) {
    return res.json({ status: "loading", message: "Data is already being synchronized" });
  }

  const newWargaUrl = req.body?.wargaUrl || req.query?.wargaUrl;
  const newSpptUrl = req.body?.spptUrl || req.query?.spptUrl;

  if (newWargaUrl && typeof newWargaUrl === "string") WARGA_CSV_URL = newWargaUrl;
  if (newSpptUrl && typeof newSpptUrl === "string") SPPT_CSV_URL = newSpptUrl;

  const result = await loadData();
  if (result?.success) {
    res.json({ status: "ok", message: "Data reloaded successfully" });
  } else {
    res.status(500).json({ status: "error", message: result?.message || "Unknown error" });
  }
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
