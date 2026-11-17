export function compressImageDataUrl(
  sourceDataUrl: string,
  maxWidth = 480,
  maxHeight = 600,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve) => {
    if (!sourceDataUrl || !sourceDataUrl.startsWith('data:image')) {
      resolve(sourceDataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}
