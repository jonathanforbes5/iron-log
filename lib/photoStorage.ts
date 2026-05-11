// Photos are stored separately from KV state to avoid size limits.
// Each photo is a compressed JPEG stored in localStorage under `photo_{id}`.

const PREFIX = 'ironlog_photo_';
const MAX_DIM = 800;
const QUALITY = 0.75;

export function savePhotoData(id: string, dataUrl: string): void {
  try {
    localStorage.setItem(PREFIX + id, dataUrl);
  } catch {
    // quota exceeded — try to warn but don't crash
    console.warn('Photo storage full');
  }
}

export function loadPhotoData(id: string): string | null {
  try {
    return localStorage.getItem(PREFIX + id);
  } catch {
    return null;
  }
}

export function deletePhotoData(id: string): void {
  try {
    localStorage.removeItem(PREFIX + id);
  } catch { /* ignore */ }
}

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('no canvas context')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', QUALITY));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
