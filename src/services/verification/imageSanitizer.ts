import sharp from 'sharp';
import crypto from 'node:crypto';

export interface SanitizedImage {
  sanitizedBuffer: Buffer;
  mimeType: string;
  sha256Hash: string;
  perceptualHash: string;
  width: number;
  height: number;
}

export class ImageSanitizer {
  // Magic bytes check (Section 14: Never trust file extensions or client MIME)
  public static validateMagicBytes(buffer: Buffer): { isValid: boolean; detectedType?: string } {
    if (buffer.length < 12) {
      return { isValid: false };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true, detectedType: 'image/jpeg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { isValid: true, detectedType: 'image/png' };
    }

    // WEBP: RIFF .... WEBP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { isValid: true, detectedType: 'image/webp' };
    }

    return { isValid: false };
  }

  /**
   * Strips EXIF metadata, normalizes rotation, resizes if too large,
   * re-encodes into clean format, and calculates both SHA-256 and perceptual hash.
   */
  public static async sanitizeImage(rawBuffer: Buffer, maxDimension = 2048): Promise<SanitizedImage> {
    const magicCheck = this.validateMagicBytes(rawBuffer);
    if (!magicCheck.isValid) {
      throw new Error('SECURITY_ALERT: Invalid image magic bytes or disguised executable payload.');
    }

    // Process through Sharp: strips EXIF metadata automatically unless .withMetadata() is specified.
    const image = sharp(rawBuffer, { failOnError: true });
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    // Re-encode to clean, sanitized WebP (stripping all EXIF, GPS, camera serials, comments)
    let pipeline = sharp(rawBuffer).rotate(); // auto-orient based on orientation before stripping

    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      pipeline = pipeline.resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const sanitizedBuffer = await pipeline.webp({ quality: 90 }).toBuffer();
    const finalMeta = await sharp(sanitizedBuffer).metadata();

    // SHA-256 hash of the sanitized buffer
    const sha256Hash = crypto.createHash('sha256').update(sanitizedBuffer).digest('hex');

    // Generate simplified perceptual aHash (average hash) for duplicate card layout detection
    const perceptualHash = await this.computeAverageHash(sanitizedBuffer);

    return {
      sanitizedBuffer,
      mimeType: 'image/webp',
      sha256Hash,
      perceptualHash,
      width: finalMeta.width || 0,
      height: finalMeta.height || 0,
    };
  }

  /**
   * Computes an 8x8 average perceptual hash (aHash)
   * Resizes to 8x8 grayscale and creates 64-bit binary fingerprint
   */
  public static async computeAverageHash(buffer: Buffer): Promise<string> {
    const rawPixels = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    let sum = 0;
    for (let i = 0; i < 64; i++) {
      sum += rawPixels[i];
    }
    const avg = sum / 64;

    let hashBits = '';
    for (let i = 0; i < 64; i++) {
      hashBits += rawPixels[i] >= avg ? '1' : '0';
    }

    // Convert 64-bit binary to 16-character hex
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = parseInt(hashBits.slice(i, i + 4), 2);
      hex += nibble.toString(16);
    }
    return hex;
  }
}
