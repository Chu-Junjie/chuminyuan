export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export async function validateImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES)
    throw Error("每张图片最多 15 MB，请压缩后再试。");
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes[0] === 137 && ascii.slice(1, 4) === "PNG";
  const webp = ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
  const heic =
    ascii.slice(4, 8) === "ftyp" &&
    /heic|heix|hevc|hevx|mif1|msf1/.test(ascii.slice(8));
  if (!jpg && !png && !webp && !heic)
    throw Error("请选择真实的 JPG、PNG、WebP 或 HEIC 图片。");
  return heic
    ? "image/heic"
    : png
      ? "image/png"
      : webp
        ? "image/webp"
        : "image/jpeg";
}
export async function browserImage(file: File, mime: string): Promise<Blob> {
  if (mime === "image/heic") {
    const { default: convert } = await import("heic2any");
    const out = await convert({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    return Array.isArray(out) ? out[0] : out;
  }
  return file.slice(0, file.size, mime);
}
export async function cropImage(
  blob: Blob,
  crop: { x: number; y: number; width: number; height: number },
) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((bitmap.width * crop.width) / 100));
  canvas.height = Math.max(1, Math.round((bitmap.height * crop.height) / 100));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("浏览器无法裁剪图片");
  ctx.drawImage(
    bitmap,
    (bitmap.width * crop.x) / 100,
    (bitmap.height * crop.y) / 100,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("裁剪失败"))),
      "image/jpeg",
      0.9,
    ),
  );
}
