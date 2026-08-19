/**
 * Ridimensiona un'immagine lato client e la restituisce come data URL JPEG.
 * Serve a tenere le foto profilo dentro localStorage: 200px a qualità 0.7
 * stanno in poche decine di KB.
 */
export async function resizeImage(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxSize) {
          h = (h * maxSize) / w;
          w = maxSize;
        }
      } else if (h > maxSize) {
        w = (w * maxSize) / h;
        h = maxSize;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas non disponibile"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    // senza questo un file corrotto lascerebbe la promise appesa per sempre
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("immagine non leggibile"));
    };
    img.src = url;
  });
}
