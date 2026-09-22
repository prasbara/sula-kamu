import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import { ModerationService } from '../safety/moderationService';

export type CampaignType =
  | 'SPONSORED_BLOG'
  | 'HOMEPAGE_PLACEMENT'
  | 'STUDENT_EVENT'
  | 'COMMUNITY_SPOTLIGHT'
  | 'CAMPAIGN_PARTNERSHIP'
  | 'OTHER';

export type AdvertisingLeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'REJECTED';

export interface AdvertisingInquiryRecord {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  campaign_type: CampaignType;
  budget_range: string | null;
  target_audience: string | null;
  message: string;
  status: AdvertisingLeadStatus;
  internal_notes: string | null;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInquiryInput {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  campaignType: CampaignType;
  budgetRange?: string;
  targetAudience?: string;
  message: string;
  ipAddress?: string;
}

export class AdvertisingService {
  /**
   * Submit an advertising / partnership inquiry from the public form
   */
  public static createInquiry(input: CreateInquiryInput): AdvertisingInquiryRecord {
    const db = getDatabase();

    // 1. Validate inputs
    const companyName = (input.companyName || '').trim();
    const contactName = (input.contactName || '').trim();
    const contactEmail = (input.contactEmail || '').trim().toLowerCase();
    const contactPhone = (input.contactPhone || '').trim();
    const message = (input.message || '').trim();

    if (!companyName || companyName.length < 2) {
      throw new Error('Nama organisasi atau brand minimal 2 karakter.');
    }
    if (!contactName || contactName.length < 2) {
      throw new Error('Nama penanggung jawab (PIC) minimal 2 karakter.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactEmail || !emailRegex.test(contactEmail)) {
      throw new Error('Alamat email kontak tidak valid.');
    }
    if (!message || message.length < 15) {
      throw new Error('Rincian rencana promosi / pesan minimal 15 karakter.');
    }

    const validCampaignTypes: CampaignType[] = [
      'SPONSORED_BLOG',
      'HOMEPAGE_PLACEMENT',
      'STUDENT_EVENT',
      'COMMUNITY_SPOTLIGHT',
      'CAMPAIGN_PARTNERSHIP',
      'OTHER',
    ];
    const campaignType = validCampaignTypes.includes(input.campaignType)
      ? input.campaignType
      : 'OTHER';

    // 2. Anti-spam rate limiting: max 5 inquiries per email or IP in 1 hour
    const recentCheck = db.prepare(`
      SELECT COUNT(*) as count 
      FROM advertising_inquiries 
      WHERE contact_email = ? 
        AND datetime(created_at) >= datetime('now', '-1 hour')
    `).get(contactEmail) as { count: number };

    if (recentCheck && Number(recentCheck.count) >= 5) {
      throw new Error('Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu beberapa saat.');
    }

    // 3. Insert inquiry
    const inquiryId = `ad_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    db.prepare(`
      INSERT INTO advertising_inquiries (
        id, company_name, contact_name, contact_email, contact_phone,
        campaign_type, budget_range, target_audience, message,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', datetime('now'), datetime('now'))
    `).run(
      inquiryId,
      companyName,
      contactName,
      contactEmail,
      contactPhone || null,
      campaignType,
      input.budgetRange || null,
      input.targetAudience || null,
      message
    );

    // 4. Audit logging
    ModerationService.logAudit({
      actorId: 'system_public',
      actorRole: 'ANONYMOUS',
      action: 'ADVERTISING_INQUIRY_CREATED',
      targetResource: 'advertising_inquiries',
      targetId: inquiryId,
      details: `New inquiry from ${companyName} (${contactEmail}) for ${campaignType}`,
      ipAddress: input.ipAddress,
    });

    return db.prepare('SELECT * FROM advertising_inquiries WHERE id = ?').get(inquiryId) as unknown as AdvertisingInquiryRecord;
  }

  /**
   * Get all inquiries for admin dashboard
   */
  public static getInquiries(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): { inquiries: AdvertisingInquiryRecord[]; total: number } {
    const db = getDatabase();
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let countQuery = 'SELECT COUNT(*) as count FROM advertising_inquiries';
    let dataQuery = 'SELECT * FROM advertising_inquiries';
    const params: any[] = [];

    if (options?.status && options.status !== 'ALL') {
      countQuery += ' WHERE status = ?';
      dataQuery += ' WHERE status = ?';
      params.push(options.status);
    }

    dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const countRow = db.prepare(countQuery).get(...params) as { count: number };
    const inquiries = db.prepare(dataQuery).all(...params, limit, offset) as unknown as AdvertisingInquiryRecord[];

    return {
      inquiries,
      total: countRow.count,
    };
  }

  /**
   * Update inquiry status and internal notes
   */
  public static updateInquiryStatus(input: {
    inquiryId: string;
    status: AdvertisingLeadStatus;
    adminId: string;
    internalNotes?: string;
  }): AdvertisingInquiryRecord {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM advertising_inquiries WHERE id = ?').get(input.inquiryId) as AdvertisingInquiryRecord | undefined;

    if (!existing) {
      throw new Error('Inquiry not found');
    }

    db.prepare(`
      UPDATE advertising_inquiries 
      SET status = ?, internal_notes = COALESCE(?, internal_notes), assigned_admin_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(input.status, input.internalNotes || null, input.adminId, input.inquiryId);

    ModerationService.logAudit({
      actorId: input.adminId,
      actorRole: 'SUPPORT_ADMIN',
      action: 'ADVERTISING_INQUIRY_STATUS_UPDATED',
      targetResource: 'advertising_inquiries',
      targetId: input.inquiryId,
      details: `Status transitioned from ${existing.status} to ${input.status}`,
    });

    return db.prepare('SELECT * FROM advertising_inquiries WHERE id = ?').get(input.inquiryId) as unknown as AdvertisingInquiryRecord;
  }
}
