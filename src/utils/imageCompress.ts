export function compressImageDataUrl(
  sourceDataUrl: string,
  maxWidth = 240,
  maxHeight = 300,
  quality = 0.62,
  maxChars = 32000
): Promise<string> {
  return new Promise((resolve) => {
    if (!sourceDataUrl || !sourceDataUrl.startsWith('data:image')) {
      resolve(sourceDataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      let width = Math.max(1, Math.round(img.width * ratio));
      let height = Math.max(1, Math.round(img.height * ratio));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }

      // Detect WebP encoder support (significantly smaller than JPEG at same clarity)
      const renderEncoded = (w: number, h: number, mime: string, q: number): string => {
        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL(mime, q);
      };

      const webpProbe = renderEncoded(width, height, 'image/webp', quality);
      const mimeType = webpProbe.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';

      let q = quality;
      let compressed = mimeType === 'image/webp' ? webpProbe : renderEncoded(width, height, mimeType, q);

      // Step 1: Lower encoding quality progressively
      while (compressed.length > maxChars && q > 0.34) {
        q = Math.max(0.34, Number((q - 0.08).toFixed(2)));
        compressed = renderEncoded(width, height, mimeType, q);
      }

      // Step 2: If still above target size, progressively downscale dimensions
      while (compressed.length > maxChars && width > 120 && height > 120) {
        width = Math.max(120, Math.round(width * 0.8));
        height = Math.max(120, Math.round(height * 0.8));
        compressed = renderEncoded(width, height, mimeType, q);
      }

      resolve(compressed);
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}
