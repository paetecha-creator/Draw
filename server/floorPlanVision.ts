import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export interface DetectedTableMarker {
  tableNumber: string;
  detectedLabel: string;
  x: number;
  y: number;
}

export interface DetectFloorPlanResult {
  markers: DetectedTableMarker[];
  matchedCount: number;
  totalRosterTables: number;
  unmatchedTables: string[];
}

function normalizeTableCore(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/^(โต๊ะที่|โต๊ะ|TABLE|TBL|NO\.?|#)\s*/i, '')
    .replace(/[\s\-_]+/g, '')
    .replace(/^([A-Z]*)0+(\d+)$/, '$1$2');
}

function stripZeroPadding(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]+/g, '')
    .replace(/^([A-Z]*)0+(\d+)$/, '$1$2');
}

function matchLabelToRosterTable(
  detectedLabel: string,
  suggestedRosterTable: string | undefined,
  rosterTables: string[]
): string {
  if (!rosterTables.length) {
    return (suggestedRosterTable || detectedLabel).trim();
  }

  // 1. Exact match on suggestedRosterTable
  if (suggestedRosterTable) {
    const exactSuggested = rosterTables.find(
      (r) => r.trim().toUpperCase() === suggestedRosterTable.trim().toUpperCase()
    );
    if (exactSuggested) return exactSuggested;
  }

  // 2. Exact match on detectedLabel
  const labelUpper = detectedLabel.trim().toUpperCase();
  const exactLabel = rosterTables.find((r) => r.trim().toUpperCase() === labelUpper);
  if (exactLabel) return exactLabel;

  // 3. Normalized core match (handles "โต๊ะ 05" vs "5", "Table A01" vs "A1", "โต๊ะ 01 (VIP)" vs "1")
  const normLabel = normalizeTableCore(detectedLabel);
  const normSuggested = suggestedRosterTable ? normalizeTableCore(suggestedRosterTable) : '';

  if (normSuggested) {
    const matchSuggestedNorm = rosterTables.find((r) => normalizeTableCore(r) === normSuggested);
    if (matchSuggestedNorm) return matchSuggestedNorm;
  }

  if (normLabel) {
    const matchLabelNorm = rosterTables.find((r) => normalizeTableCore(r) === normLabel);
    if (matchLabelNorm) return matchLabelNorm;

    const strippedLabel = stripZeroPadding(detectedLabel);
    const matchStripped = rosterTables.find((r) => stripZeroPadding(r) === strippedLabel);
    if (matchStripped) return matchStripped;
  }

  return (suggestedRosterTable || detectedLabel).trim();
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim());
  if (!match) {
    throw new Error('Invalid floor plan image format. Expected a base64 data URL.');
  }
  return {
    mimeType: match[1] || 'image/jpeg',
    base64Data: match[2],
  };
}

export async function detectFloorPlanTables(
  imageDataUrl: string,
  rosterTablesInput: string[] = []
): Promise<DetectFloorPlanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.'
    );
  }

  const rosterTables = Array.from(
    new Set(rosterTablesInput.map((t) => String(t ?? '').trim()).filter(Boolean))
  );

  const { mimeType, base64Data } = parseDataUrl(imageDataUrl);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const rosterSection =
    rosterTables.length > 0
      ? `Here is the EXACT official list of table numbers from the organizer's Excel roster (${rosterTables.length} tables):\n${JSON.stringify(rosterTables)}\n\nFor EVERY table label you read on the floor plan image, match it to the exact corresponding string from this Excel list whenever it represents the same table (for example, if the image shows "5" or "05" or "T5" and the Excel list contains "โต๊ะ 05" or "โต๊ะ 5", set matchedRosterTable to the exact Excel string "โต๊ะ 05").`
      : `No Excel table list was provided yet. Extract every table label/number printed on the floor plan image and set matchedRosterTable equal to the detectedLabel.`;

  const promptText = `You are a precision spatial OCR & banquet floor-plan analysis engine.

Task:
1. Carefully scan the entire banquet floor plan image and read EVERY table number / alphanumeric label printed on or inside each table (examples: "1", "01", "A1", "B-02", "VIP 1", "VIP1", "โต๊ะ 1", "T10", etc.).
2. Ignore non-table text such as stage ("เวที", "STAGE"), entrance ("ทางเข้า"), restroom, bar, buffet, legend titles, or decorative headers.
3. For each table found, return its tight bounding box around the table circle/shape (centered precisely on the table's label/center) using standard normalized 0-1000 coordinates:
   - ymin (0 = top edge, 1000 = bottom edge)
   - xmin (0 = left edge, 1000 = right edge)
   - ymax (0 = top edge, 1000 = bottom edge)
   - xmax (0 = left edge, 1000 = right edge)
4. Double-check every digit and letter carefully (e.g. distinguish 3 vs 8, 1 vs 7, 6 vs 9, A vs 4, B vs 8) and verify row/column ordering so neighboring tables never swap numbers.

${rosterSection}

Return ONLY valid JSON matching the required schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        { text: promptText },
      ],
    },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tables: {
            type: Type.ARRAY,
            description: 'All banquet tables detected on the floor plan image.',
            items: {
              type: Type.OBJECT,
              properties: {
                detectedLabel: {
                  type: Type.STRING,
                  description: 'Exact text/number printed on the table in the image (e.g. "A1", "05", "VIP 1").',
                },
                matchedRosterTable: {
                  type: Type.STRING,
                  description:
                    'Exact matching table string from the Excel roster list if provided, otherwise same as detectedLabel.',
                },
                ymin: {
                  type: Type.NUMBER,
                  description: 'Top edge in 0..1000 normalized image coordinates.',
                },
                xmin: {
                  type: Type.NUMBER,
                  description: 'Left edge in 0..1000 normalized image coordinates.',
                },
                ymax: {
                  type: Type.NUMBER,
                  description: 'Bottom edge in 0..1000 normalized image coordinates.',
                },
                xmax: {
                  type: Type.NUMBER,
                  description: 'Right edge in 0..1000 normalized image coordinates.',
                },
              },
              required: ['detectedLabel', 'matchedRosterTable', 'ymin', 'xmin', 'ymax', 'xmax'],
            },
          },
        },
        required: ['tables'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  let parsed: {
    tables?: Array<{
      detectedLabel?: string;
      matchedRosterTable?: string;
      ymin?: number;
      xmin?: number;
      ymax?: number;
      xmax?: number;
    }>;
  } = {};

  try {
    parsed = JSON.parse(rawText);
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse table detection output from vision model.');
    }
  }

  const rawItems = Array.isArray(parsed.tables) ? parsed.tables : [];
  const deduped = new Map<string, DetectedTableMarker>();

  for (const item of rawItems) {
    const detectedLabel = String(item.detectedLabel ?? '').trim();
    const suggested = String(item.matchedRosterTable ?? '').trim();
    if (!detectedLabel && !suggested) continue;

    const ymin = Number(item.ymin);
    const xmin = Number(item.xmin);
    const ymax = Number(item.ymax);
    const xmax = Number(item.xmax);
    if (
      !Number.isFinite(ymin) ||
      !Number.isFinite(xmin) ||
      !Number.isFinite(ymax) ||
      !Number.isFinite(xmax)
    ) {
      continue;
    }

    // Convert 0..1000 bounding box center to 0..100 percentage coordinates
    const centerX = ((xmin + xmax) / 2) / 10;
    const centerY = ((ymin + ymax) / 2) / 10;
    const x = Math.min(99, Math.max(1, Number(centerX.toFixed(2))));
    const y = Math.min(99, Math.max(1, Number(centerY.toFixed(2))));

    const canonicalTable = matchLabelToRosterTable(detectedLabel || suggested, suggested, rosterTables);
    if (!canonicalTable) continue;

    const key = canonicalTable.toUpperCase();
    if (!deduped.has(key)) {
      deduped.set(key, {
        tableNumber: canonicalTable,
        detectedLabel: detectedLabel || canonicalTable,
        x,
        y,
      });
    }
  }

  const markers = Array.from(deduped.values()).sort((a, b) =>
    a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true, sensitivity: 'base' })
  );

  const detectedKeys = new Set(markers.map((m) => m.tableNumber.trim().toUpperCase()));
  const detectedNormKeys = new Set(markers.map((m) => normalizeTableCore(m.tableNumber)));

  const unmatchedTables = rosterTables.filter(
    (tbl) =>
      !detectedKeys.has(tbl.trim().toUpperCase()) &&
      !detectedNormKeys.has(normalizeTableCore(tbl))
  );

  const matchedCount =
    rosterTables.length > 0 ? rosterTables.length - unmatchedTables.length : markers.length;

  return {
    markers,
    matchedCount,
    totalRosterTables: rosterTables.length,
    unmatchedTables,
  };
}
