import type { Request, Response } from 'express';
import { detectFloorPlanTables } from '../../server/floorPlanVision';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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
    res.status(200).json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to analyze floor plan image.';
    res.status(500).json({ error: message });
  }
}
