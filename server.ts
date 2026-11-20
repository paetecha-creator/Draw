import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { detectFloorPlanTables } from './server/floorPlanVision';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Server-side API: Detect table labels/numbers on floor plan image & match Excel roster
  app.post('/api/floor-plan/detect-tables', async (req, res) => {
    try {
      const { imageDataUrl, rosterTables } = req.body ?? {};
      if (!imageDataUrl || typeof imageDataUrl !== 'string') {
        res.status(400).json({ error: 'Missing floor plan imageDataUrl.' });
        return;
      }

      const tablesList = Array.isArray(rosterTables)
        ? rosterTables.map((t) => String(t ?? '').trim()).filter(Boolean)
        : [];

      const result = await detectFloorPlanTables(imageDataUrl, tablesList);
      res.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to analyze floor plan image.';
      console.error('Floor plan detection error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
