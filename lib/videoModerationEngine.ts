/**
 * VideoModerationEngine — Client-side Privacy-Preserving Video Moderation Engine
 *
 * Core Principles:
 *  1. 100% On-Device: Runs in browser memory using HTML5 Canvas & ImageData.
 *  2. Zero Uploads: Never uploads, records, or transmits raw camera footage to any server.
 *  3. Multi-frame Temporal Consistency: Never triggers enforcement on a single isolated or ambiguous frame.
 *  4. Strict False-Positive Protection:
 *     - States: NORMAL -> SUSPECTED -> CONFIRMED -> ENFORCED.
 *     - Requires sustained confidence threshold (>= 0.85) across consecutive temporal sampling windows (minimum 3 seconds).
 *     - Automatic score decay if suspected frames are not consistently maintained.
 */

export type ModerationState = 'NORMAL' | 'SUSPECTED' | 'CONFIRMED' | 'ENFORCED';

export interface VideoViolationPayload {
  violationType: 'EXPLICIT_BEHAVIOR' | 'NUDITY' | 'INAPPROPRIATE_EXPOSURE';
  severity: 'HIGH' | 'CRITICAL';
  confidence: number;
  detectionDurationMs: number;
  sampleCount: number;
  reason: string;
  automatedAction: 'RESTRICT_USER';
  metadata: {
    skinExposureRatio: number;
    torsoExposureRatio: number;
    faceAnchorPresent: boolean;
    consecutiveHits: number;
    sampleRateMs: number;
  };
}

export interface ModerationEngineOptions {
  sampleIntervalMs?: number;
  confidenceThreshold?: number;
  consecutiveRequired?: number;
  onStateChange?: (state: ModerationState, confidence: number) => void;
  onEnforce?: (violation: VideoViolationPayload) => void;
}

export class VideoModerationEngine {
  private state: ModerationState = 'NORMAL';
  private timer: NodeJS.Timeout | null = null;
  private consecutiveHits = 0;
  private firstDetectedAt: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private readonly sampleIntervalMs: number;
  private readonly confidenceThreshold: number;
  private readonly consecutiveRequired: number;
  private readonly onStateChange?: (state: ModerationState, confidence: number) => void;
  private readonly onEnforce?: (violation: VideoViolationPayload) => void;

  constructor(opts: ModerationEngineOptions = {}) {
    this.sampleIntervalMs = opts.sampleIntervalMs ?? 1000;
    this.confidenceThreshold = opts.confidenceThreshold ?? 0.85;
    this.consecutiveRequired = opts.consecutiveRequired ?? 3;
    this.onStateChange = opts.onStateChange;
    this.onEnforce = opts.onEnforce;

    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 160;
      this.canvas.height = 120;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
  }

  public getState(): ModerationState {
    return this.state;
  }

  /**
   * Start temporal sampling on active video stream element.
   */
  public start(video: HTMLVideoElement): void {
    this.stop();
    this.state = 'NORMAL';
    this.consecutiveHits = 0;
    this.firstDetectedAt = null;

    this.timer = setInterval(() => {
      this.sampleFrame(video);
    }, this.sampleIntervalMs);
  }

  /**
   * Stop sampling engine.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.consecutiveHits = 0;
    this.firstDetectedAt = null;
  }

  /**
   * Reset engine state back to NORMAL.
   */
  public reset(): void {
    this.state = 'NORMAL';
    this.consecutiveHits = 0;
    this.firstDetectedAt = null;
    if (this.onStateChange) this.onStateChange('NORMAL', 0);
  }

  /**
   * Perform single frame computer vision analysis on local canvas.
   */
  public sampleFrame(video: HTMLVideoElement): {
    score: number;
    state: ModerationState;
    skinRatio: number;
  } {
    if (this.state === 'ENFORCED') {
      return { score: 1.0, state: 'ENFORCED', skinRatio: 0 };
    }

    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0 || !this.ctx || !this.canvas) {
      return { score: 0, state: this.state, skinRatio: 0 };
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const totalPixels = w * h;

    try {
      this.ctx.drawImage(video, 0, 0, w, h);
      const imgData = this.ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let skinPixelsTotal = 0;
      let skinPixelsHeadZone = 0;
      let skinPixelsTorsoZone = 0;

      const headCutoffY = Math.floor(h * 0.35);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // YCbCr color transform
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

          // Fitzpatrick skin tone gamut
          const isSkin =
            (cb >= 70 && cb <= 142 && cr >= 125 && cr <= 182 && r > 30) ||
            (r > 45 && g > 30 && b > 20 && (r >= g || Math.abs(r - g) <= 10) && (r > b || Math.abs(r - b) <= 15));

          if (isSkin) {
            skinPixelsTotal++;
            if (y < headCutoffY) {
              skinPixelsHeadZone++;
            } else {
              skinPixelsTorsoZone++;
            }
          }
        }
      }

      const overallSkinRatio = skinPixelsTotal / totalPixels;
      const headZonePixels = w * headCutoffY;
      const torsoZonePixels = totalPixels - headZonePixels;
      const torsoSkinRatio = skinPixelsTorsoZone / torsoZonePixels;
      const headSkinRatio = skinPixelsHeadZone / headZonePixels;

      // Check whether head/face anchor is present
      const faceAnchorPresent = headSkinRatio >= 0.05 && headSkinRatio <= 0.55;

      let frameConfidence = 0;

      // Condition 1: Massive unanchored skin exposure in center/torso without head anchor
      // (High-risk sign of close-up nudity, pelvic/genitalia exposure)
      if (torsoSkinRatio >= 0.55 && !faceAnchorPresent) {
        frameConfidence = Math.min(0.96, 0.70 + (torsoSkinRatio - 0.55) * 1.5);
      } else if (torsoSkinRatio >= 0.68 && faceAnchorPresent) {
        // Condition 2: Excessive torso/body exposure (nude torso close up)
        frameConfidence = Math.min(0.92, 0.65 + (torsoSkinRatio - 0.68) * 1.2);
      } else if (overallSkinRatio >= 0.75) {
        // Condition 3: Entire camera view filled with flesh/skin pixels (> 75%)
        frameConfidence = 0.90;
      } else if (torsoSkinRatio >= 0.45 && !faceAnchorPresent) {
        // Ambiguous frame: e.g. close hand or arm
        frameConfidence = 0.60;
      } else {
        frameConfidence = 0.05;
      }

      return this.processEvaluation(frameConfidence, overallSkinRatio, torsoSkinRatio, faceAnchorPresent);
    } catch {
      return { score: 0, state: this.state, skinRatio: 0 };
    }
  }

  /**
   * Process raw evaluation metrics through the temporal state machine.
   * Enables automated CI/Node unit testing without requiring an active browser DOM.
   */
  public processEvaluation(
    frameConfidence: number,
    overallSkinRatio = 0,
    torsoSkinRatio = 0,
    faceAnchorPresent = false
  ): {
    score: number;
    state: ModerationState;
    skinRatio: number;
  } {
    if (this.state === 'ENFORCED') {
      return { score: 1.0, state: 'ENFORCED', skinRatio: overallSkinRatio };
    }

    const now = Date.now();
    if (frameConfidence >= this.confidenceThreshold) {
      if (!this.firstDetectedAt) this.firstDetectedAt = now;
      this.consecutiveHits++;

      if (this.consecutiveHits >= this.consecutiveRequired) {
        this.state = 'CONFIRMED';
        if (this.onStateChange) this.onStateChange('CONFIRMED', frameConfidence);

        // Transition to ENFORCED & trigger callback
        this.state = 'ENFORCED';
        if (this.onStateChange) this.onStateChange('ENFORCED', frameConfidence);

        const durationMs = this.firstDetectedAt ? now - this.firstDetectedAt : 3000;
        if (this.onEnforce) {
          this.onEnforce({
            violationType: 'EXPLICIT_BEHAVIOR',
            severity: 'CRITICAL',
            confidence: frameConfidence,
            detectionDurationMs: durationMs,
            sampleCount: this.consecutiveHits,
            reason: `Deteksi aktivitas seksual/konten asusila otomatis (${(frameConfidence * 100).toFixed(0)}% konsisten selama ${Math.round(durationMs / 1000)} detik).`,
            automatedAction: 'RESTRICT_USER',
            metadata: {
              skinExposureRatio: Math.round(overallSkinRatio * 100) / 100,
              torsoExposureRatio: Math.round(torsoSkinRatio * 100) / 100,
              faceAnchorPresent,
              consecutiveHits: this.consecutiveHits,
              sampleRateMs: this.sampleIntervalMs,
            },
          });
        }

        this.stop();
        return { score: frameConfidence, state: 'ENFORCED', skinRatio: overallSkinRatio };
      } else {
        // Suspected, requires more consecutive temporal frames
        this.state = 'SUSPECTED';
        if (this.onStateChange) this.onStateChange('SUSPECTED', frameConfidence);
      }
    } else {
      // Natural score decay to prevent false positives from single ambiguous frames
      if (this.consecutiveHits > 0) {
        this.consecutiveHits--;
      }
      if (this.consecutiveHits === 0) {
        this.firstDetectedAt = null;
        if (this.state !== 'NORMAL') {
          this.state = 'NORMAL';
          if (this.onStateChange) this.onStateChange('NORMAL', frameConfidence);
        }
      }
    }

    return { score: frameConfidence, state: this.state, skinRatio: overallSkinRatio };
  }
}

