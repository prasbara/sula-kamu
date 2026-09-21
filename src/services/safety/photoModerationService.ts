import sharp from 'sharp';
import { ImageSanitizer, SanitizedImage } from '../verification/imageSanitizer.js';

export interface PhotoModerationResult {
  isApproved: boolean;
  sanitizedBuffer?: Buffer;
  mimeType?: string;
  sha256Hash?: string;
  rejectionReason?: string;
  riskScore: number;
  skinPercentage: number;
}

export class PhotoModerationService {
  /**
   * Evaluates if a pixel corresponds to human skin tones using YCbCr color model
   */
  private static isSkinPixel(r: number, g: number, b: number): boolean {
    // Avoid extreme near-black or near-white blowouts
    if (r < 40 || g < 20 || b < 20) return false;
    if (Math.max(r, g, b) - Math.min(r, g, b) < 15) return false;

    // YCbCr conversion
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    // Standard empirical human skin chrominance cluster
    return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
  }

  /**
   * Scans an uploaded profile photo for NSFW, explicit content, and nudity
   */
  public static async inspectProfilePhoto(rawBuffer: Buffer): Promise<PhotoModerationResult> {
    // 1. Magic bytes & image structure validation
    const magicCheck = ImageSanitizer.validateMagicBytes(rawBuffer);
    if (!magicCheck.isValid) {
      return {
        isApproved: false,
        rejectionReason: 'Format file tidak valid. Harap unggah file foto asli dalam format JPG, PNG, atau WebP.',
        riskScore: 100,
        skinPercentage: 0,
      };
    }

    // 2. Minimum & Maximum dimensions check
    const meta = await sharp(rawBuffer).metadata();
    if (!meta.width || !meta.height || meta.width < 180 || meta.height < 180) {
      return {
        isApproved: false,
        rejectionReason: 'Resolusi foto terlalu kecil atau buram. Minimal ukuran foto adalah 200x200 piksel.',
        riskScore: 60,
        skinPercentage: 0,
      };
    }

    // 3. Strip EXIF and normalize to WebP
    const sanitized: SanitizedImage = await ImageSanitizer.sanitizeImage(rawBuffer, 1024);

    // 4. Downscale to 128x128 for rapid color space and skin tone analysis
    const sampleWidth = 128;
    const sampleHeight = 128;
    const rawPixels = await sharp(sanitized.sanitizedBuffer)
      .resize(sampleWidth, sampleHeight, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer();

    let skinPixelsTotal = 0;
    let skinPixelsCenter = 0;
    let totalCenterPixels = 0;

    const totalPixels = sampleWidth * sampleHeight;

    for (let y = 0; y < sampleHeight; y++) {
      for (let x = 0; x < sampleWidth; x++) {
        const idx = (y * sampleWidth + x) * 3;
        const r = rawPixels[idx];
        const g = rawPixels[idx + 1];
        const b = rawPixels[idx + 2];

        const isSkin = this.isSkinPixel(r, g, b);
        if (isSkin) {
          skinPixelsTotal++;
        }

        // Check center region (torso / body area)
        if (x >= 32 && x <= 96 && y >= 32 && y <= 96) {
          totalCenterPixels++;
          if (isSkin) {
            skinPixelsCenter++;
          }
        }
      }
    }

    const skinRatio = skinPixelsTotal / totalPixels;
    const centerSkinRatio = totalCenterPixels > 0 ? skinPixelsCenter / totalCenterPixels : 0;
    const skinPercentage = Math.round(skinRatio * 100);

    // 5. Anti-NSFW / Nudity Rule:
    // Typical portrait face has between 10% - 28% skin coverage.
    // Explicit / nude photos typically show > 38% skin coverage across the canvas or > 50% in the torso region.
    if (skinRatio > 0.40 || centerSkinRatio > 0.52) {
      return {
        isApproved: false,
        rejectionReason: 'Foto profil ditolak oleh sistem moderasi keamanan otomatis karena terdeteksi terlalu terbuka / vulgar (indikasi NSFW/nude). SULA menerapkan standar kesopanan ketat khusus mahasiswa. Silakan unggah foto berpakaian sopan.',
        riskScore: 95,
        skinPercentage,
      };
    }

    // 6. Anti-Blank / Solid color check (rejects completely black/white or fake blank images)
    let varianceSum = 0;
    const avgVal = rawPixels.reduce((a, b) => a + b, 0) / rawPixels.length;
    for (let i = 0; i < rawPixels.length; i += 3) {
      varianceSum += Math.abs(rawPixels[i] - avgVal);
    }
    const variance = varianceSum / (rawPixels.length / 3);
    if (variance < 6) {
      return {
        isApproved: false,
        rejectionReason: 'Foto tampak kosong, berwarna solid, atau tidak memuat objek manusia. Harap unggah foto asli diri Anda.',
        riskScore: 80,
        skinPercentage,
      };
    }

    return {
      isApproved: true,
      sanitizedBuffer: sanitized.sanitizedBuffer,
      mimeType: sanitized.mimeType,
      sha256Hash: sanitized.sha256Hash,
      riskScore: 0,
      skinPercentage,
    };
  }
}
