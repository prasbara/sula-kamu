import { createWorker } from 'tesseract.js';
import { Institution } from '../../types/index.js';

export interface OCRAnalysisResult {
  extractedText: string;
  institutionMatchScore: number;
  nameMatchScore: number;
  hasSuspiciousKeywords: boolean;
  suspiciousKeywordsFound: string[];
  overallConfidence: number;
  recommendedStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  reasonSummary: string;
}

export class OCRAnalyzer {
  /**
   * Helper: calculate normalized Levenshtein similarity [0, 1]
   */
  public static calculateStringSimilarity(s1: string, s2: string): number {
    const longer = s1.length >= s2.length ? s1 : s2;
    const shorter = s1.length >= s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;

    const costs: number[] = [];
    for (let i = 0; i <= longer.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= shorter.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[shorter.length] = lastValue;
    }
    return (longer.length - costs[shorter.length]) / longer.length;
  }

  /**
   * Performs real OCR text extraction on image buffer and evaluates student card signals
   */
  public static async analyzeCard(
    imageBuffer: Buffer,
    expectedInstitution: Institution,
    declaredUserName: string
  ): Promise<OCRAnalysisResult> {
    const worker = await createWorker('ind'); // Indonesian language model
    let extractedText = '';
    let confidence = 0;

    try {
      const ret = await worker.recognize(imageBuffer);
      extractedText = ret.data.text || '';
      confidence = ret.data.confidence || 0;
    } catch (err) {
      console.error('OCR recognition error:', err);
    } finally {
      await worker.terminate();
    }

    const upperText = extractedText.toUpperCase();

    // 1. Anti-fraud / template keyword detection
    const suspiciousKeywords = [
      'CONTOH',
      'SAMPLE',
      'SPECIMEN',
      'TEMPLATE',
      'DUMMY',
      'PHOTOSHOP',
      'FAKE',
      'GENERATED',
      'PREVIEW ONLY',
    ];
    const suspiciousFound = suspiciousKeywords.filter((kw) => upperText.includes(kw));
    const hasSuspiciousKeywords = suspiciousFound.length > 0;

    // 2. Institution matching keywords
    const instNameParts = expectedInstitution.name
      .toUpperCase()
      .split(/\s+/)
      .filter((w) => !['UNIVERSITAS', 'POLITEKNIK', 'SEKOLAH', 'TINGGI', 'AKADEMI', 'SEMARANG', 'NEGERI', 'KEMENKES'].includes(w));
    
    let institutionKeywordsMatched = 0;
    for (const part of instNameParts) {
      if (part.length > 2 && upperText.includes(part)) {
        institutionKeywordsMatched++;
      }
    }
    const shortNameMatched = upperText.includes(expectedInstitution.short_name.toUpperCase());
    
    let institutionMatchScore = 0;
    if (shortNameMatched) institutionMatchScore += 0.6;
    if (instNameParts.length > 0) {
      institutionMatchScore += (institutionKeywordsMatched / instNameParts.length) * 0.4;
    }
    institutionMatchScore = Math.min(1.0, institutionMatchScore);

    // 3. Name consistency matching
    const declaredParts = declaredUserName
      .toUpperCase()
      .trim()
      .split(/\s+/)
      .filter((p) => p.length >= 3);

    let maxNameScore = 0;
    const extractedLines = upperText.split('\n').map((l) => l.trim()).filter((l) => l.length >= 3);

    for (const part of declaredParts) {
      for (const line of extractedLines) {
        if (line.includes(part)) {
          maxNameScore = Math.max(maxNameScore, 0.85);
        } else {
          const sim = this.calculateStringSimilarity(part, line);
          if (sim > maxNameScore) maxNameScore = sim;
        }
      }
    }

    // Heuristic assessment
    let recommendedStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED' = 'NEEDS_REVIEW';
    let reasonSummary = '';

    if (hasSuspiciousKeywords) {
      recommendedStatus = 'REJECTED';
      reasonSummary = `Detected suspicious template or specimen keywords: ${suspiciousFound.join(', ')}`;
    } else if (institutionMatchScore >= 0.6 && maxNameScore >= 0.65) {
      recommendedStatus = 'VERIFIED';
      reasonSummary = 'High confidence institution and student name match';
    } else if (institutionMatchScore >= 0.4 || maxNameScore >= 0.4) {
      recommendedStatus = 'NEEDS_REVIEW';
      reasonSummary = 'Partial text match or low contrast card image; requires human reviewer confirmation';
    } else {
      recommendedStatus = 'REJECTED';
      reasonSummary = 'Institution or name could not be reliably verified against the selected university';
    }

    return {
      extractedText,
      institutionMatchScore,
      nameMatchScore: maxNameScore,
      hasSuspiciousKeywords,
      suspiciousKeywordsFound: suspiciousFound,
      overallConfidence: confidence,
      recommendedStatus,
      reasonSummary,
    };
  }
}
