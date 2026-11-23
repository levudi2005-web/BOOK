/**
 * Nén/cắt ảnh bìa theo đúng tỉ lệ khung sách (mm), tránh ảnh bị méo và
 * giảm dung lượng trước khi đưa vào Storage.
 */
export async function compressCoverImage(
  file: File,
  widthMm: number,
  heightMm: number,
  maxWidthPx = 1400,
): Promise<File> {
  const ratio = Math.max(0.2, widthMm / Math.max(1, heightMm));
  const targetWidth = Math.min(maxWidthPx, Math.max(600, Math.round(widthMm * 6)));
  const targetHeight = Math.round(targetWidth / ratio);
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#fffdf8';
  context.fillRect(0, 0, targetWidth, targetHeight);

  const sourceRatio = bitmap.width / bitmap.height;
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (sourceRatio > ratio) {
    sw = Math.round(bitmap.height * ratio);
    sx = Math.round((bitmap.width - sw) / 2);
  } else {
    sh = Math.round(bitmap.width / ratio);
    sy = Math.round((bitmap.height - sh) / 2);
  }
  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  let quality = 0.9;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (blob) {
      if (blob.size <= 2 * 1024 * 1024 || quality <= 0.6) {
        const name = file.name.replace(/\.[^.]+$/, '') + '-cover.jpg';
        return new File([blob], name, { type: 'image/jpeg' });
      }
    }
    quality -= 0.1;
  }
  return file;
}
