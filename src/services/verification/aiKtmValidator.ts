import { Institution } from '../../types/index.js';
import { config } from '../../config/index.js';

export interface AiKtmValidationResult {
  isAuthenticKtm: boolean;
  institutionMatch: boolean;
  nameMatch: boolean;
  isTamperedOrSuspicious: boolean;
  extractedInstitution: string;
  extractedName: string;
  extractedNim: string;
  confidence: number; // 0 - 100
  verdict: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  reason: string;
  rawAiResponse?: string;
}

export class AiKtmValidator {
  /**
   * Analyze student card image with OpenRouter multimodal AI Vision (GPT-4o-mini)
   */
  public static async analyzeCard(
    imageBuffer: Buffer,
    expectedInstitution: Institution,
    declaredUserName: string
  ): Promise<AiKtmValidationResult> {
    if (!config.OPENROUTER_API_KEY) {
      return {
        isAuthenticKtm: false,
        institutionMatch: false,
        nameMatch: false,
        isTamperedOrSuspicious: false,
        extractedInstitution: '',
        extractedName: '',
        extractedNim: '',
        confidence: 0,
        verdict: 'NEEDS_REVIEW',
        reason: 'OpenRouter API key not configured; sent to admin review',
      };
    }

    try {
      const base64Image = imageBuffer.toString('base64');
      const dataUri = `data:image/jpeg;base64,${base64Image}`;

      const systemPrompt = `You are NIVA Security & Verification AI for higher education institutions in Semarang, Central Java, Indonesia.
Your task is to analyze an uploaded student ID card (Kartu Tanda Mahasiswa / KTM) image with strict security and anti-fraud standards.

The user selected Institution: "${expectedInstitution.name}" (Code/Short: "${expectedInstitution.short_name}").
The user declared Name: "${declaredUserName}".

Analyze the image carefully:
1. Is it an authentic Indonesian student ID card (physical plastic KTM or official university digital KTM)?
2. Does it display text/logos corresponding to the selected institution ("${expectedInstitution.name}" or "${expectedInstitution.short_name}")?
3. Does the student name shown on the card match or substantially overlap with "${declaredUserName}"?
4. Look for forgery or suspicious indicators: fake templates, sample/specimen watermarks ('CONTOH', 'SAMPLE', 'SPECIMEN'), Photoshop artifacting, meme pictures, screenshot of someone else's screen, or non-KTM photos.

Decision rules:
- Auto-approve ('VERIFIED'): ONLY if the image is clearly a real KTM, matches the institution, matches or overlaps the student name, no signs of tampering, and your confidence is >= 85%.
- Admin review ('NEEDS_REVIEW'): If the card appears to be a real student card but is slightly blurry, cropped, has minor name differences (e.g. nicknames/abbreviations), or if you are not completely certain (confidence 50-84%).
- Reject / Admin flag ('REJECTED' or 'NEEDS_REVIEW'): If it is obviously fake, template sample, blank, meme, non-KTM document, or completely different university.

You MUST respond ONLY with valid JSON matching this exact structure:
{
  "is_authentic_ktm": boolean,
  "institution_match": boolean,
  "name_match": boolean,
  "is_tampered_or_suspicious": boolean,
  "extracted_institution": string,
  "extracted_name": string,
  "extracted_nim": string,
  "confidence": number, // integer 0 to 100
  "verdict": "VERIFIED" | "NEEDS_REVIEW" | "REJECTED",
  "reason": string // concise explanation in Indonesian
}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://niva.id',
          'X-Title': 'NIVA Student Verification',
        },
        body: JSON.stringify({
          model: config.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
          max_tokens: 800,
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please verify this student card (KTM) for student "${declaredUserName}" claiming to attend "${expectedInstitution.name}" (${expectedInstitution.short_name}). Return JSON only.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUri,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter AI Vision error response:', response.status, errorText);
        return {
          isAuthenticKtm: false,
          institutionMatch: false,
          nameMatch: false,
          isTamperedOrSuspicious: false,
          extractedInstitution: '',
          extractedName: '',
          extractedNim: '',
          confidence: 0,
          verdict: 'NEEDS_REVIEW',
          reason: `AI vision service response code ${response.status}; falling back to admin review`,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('AI Vision returned non-JSON text:', content);
        return {
          isAuthenticKtm: false,
          institutionMatch: false,
          nameMatch: false,
          isTamperedOrSuspicious: false,
          extractedInstitution: '',
          extractedName: '',
          extractedNim: '',
          confidence: 0,
          verdict: 'NEEDS_REVIEW',
          reason: 'Format analisa AI tidak terbaca; dialihkan ke reviewer manual',
          rawAiResponse: content,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 0));

      let verdict: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED' = parsed.verdict;
      if (parsed.is_authentic_ktm && parsed.institution_match && !parsed.is_tampered_or_suspicious && confidence >= 85) {
        verdict = 'VERIFIED';
      } else if (verdict !== 'REJECTED') {
        verdict = 'NEEDS_REVIEW';
      }

      return {
        isAuthenticKtm: !!parsed.is_authentic_ktm,
        institutionMatch: !!parsed.institution_match,
        nameMatch: !!parsed.name_match,
        isTamperedOrSuspicious: !!parsed.is_tampered_or_suspicious,
        extractedInstitution: parsed.extracted_institution || '',
        extractedName: parsed.extracted_name || '',
        extractedNim: parsed.extracted_nim || '',
        confidence,
        verdict,
        reason: parsed.reason || 'Dianalisa menggunakan AI Vision',
        rawAiResponse: content,
      };
    } catch (err: any) {
      console.error('Error during AI Vision KTM validation:', err);
      return {
        isAuthenticKtm: false,
        institutionMatch: false,
        nameMatch: false,
        isTamperedOrSuspicious: false,
        extractedInstitution: '',
        extractedName: '',
        extractedNim: '',
        confidence: 0,
        verdict: 'NEEDS_REVIEW',
        reason: `Kesalahan jaringan saat memproses AI (${err.message}); dialihkan ke tim admin review`,
      };
    }
  }
}
