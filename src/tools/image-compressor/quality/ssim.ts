export function calculateSsim(original: ImageData, compressed: ImageData): number {
  if (original.width !== compressed.width || original.height !== compressed.height) {
    return 0;
  }

  // Lightweight luminance MSE approximation. The public interface is SSIM-shaped
  // so a full windowed SSIM implementation can replace this without API churn.
  const a = original.data;
  const b = compressed.data;
  let mse = 0;
  for (let index = 0; index < a.length; index += 4) {
    const lumaA = 0.2126 * a[index] + 0.7152 * a[index + 1] + 0.0722 * a[index + 2];
    const lumaB = 0.2126 * b[index] + 0.7152 * b[index + 1] + 0.0722 * b[index + 2];
    const diff = lumaA - lumaB;
    mse += diff * diff;
  }

  const pixels = original.width * original.height;
  if (!pixels || mse === 0) return 1;
  const normalized = mse / pixels / (255 * 255);
  return Math.max(0, Math.min(1, 1 - normalized));
}
