import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import { NotifyService } from '../notification/notifyService';

export interface SupportContributionRecord {
  id: string;
  support_code: string;
  user_id: string | null;
  donor_name: string | null;
  donor_email: string | null;
  amount: number;
  payment_method: string;
  payment_proof?: string | null;
  proof_data: string | null;
  proof_mime_type: string | null;
  note: string | null;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportStats {
  total: number;
  totalContributions: number;
  pending: number;
  pendingCount: number;
  verified: number;
  verifiedCount: number;
  rejected: number;
  rejectedCount: number;
  total_verified_amount: number;
  totalVerifiedAmount: number;
}

export interface QrisConfig {
  account_name: string;
  accountName: string;
  instructions: string;
  image_data: string | null;
  qrisImageData: string | null;
  updated_at?: string;
  updatedAt?: string;
}

export class SupportContributionService {
  public static readonly MIN_AMOUNT = 5000;
  public static readonly MAX_AMOUNT = 50000000;

  /**
   * Format integer price to Indonesian Rupiah representation: Rp25.000
   */
  public static formatRupiah(amount: number): string {
    return `Rp${amount.toLocaleString('id-ID')}`;
  }

  /**
   * Generate cryptographically random, human-friendly Support Code: SUPPORT-NXXXXXX
   */
  public static generateSupportCode(): string {
    const chars = '0123456789';
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return `SUPPORT-N${code}`;
  }

  /**
   * Create new support contribution (Status: PENDING_VERIFICATION)
   */
  public static async createContribution(params: {
    amount: number;
    proofData?: string;
    payment_proof?: string;
    proofMimeType?: string;
    donorName?: string;
    donor_name?: string;
    donorEmail?: string;
    note?: string;
    userId?: string;
  }): Promise<{
    id: string;
    supportCode: string;
    support_code: string;
    amount: number;
    formattedAmount: string;
    status: 'PENDING_VERIFICATION';
    donor_name: string;
    payment_method: string;
    message: string;
    createdAt: string;
    created_at: string;
  }> {
    const db = getDatabase();

    const amount = Math.floor(Number(params.amount));
    if (isNaN(amount) || amount < this.MIN_AMOUNT) {
      throw new Error(`Nominal dukungan minimal ${this.formatRupiah(this.MIN_AMOUNT)}.`);
    }
    if (amount > this.MAX_AMOUNT) {
      throw new Error(`Nominal dukungan maksimal ${this.formatRupiah(this.MAX_AMOUNT)}.`);
    }

    const proof = params.proofData || params.payment_proof;
    if (!proof || typeof proof !== 'string' || proof.trim().length < 5) {
      throw new Error('Bukti pembayaran wajib diunggah (transfer / QRIS screenshot).');
    }

    const id = uuidv4();
    const supportCode = this.generateSupportCode();
    const rawDonorName = params.donorName || params.donor_name;
    const cleanDonorName = rawDonorName ? rawDonorName.trim().substring(0, 100) : null;
    const cleanDonorEmail = params.donorEmail ? params.donorEmail.trim().substring(0, 150) : null;
    const cleanNote = params.note ? params.note.trim().substring(0, 500) : null;
    const mimeType = params.proofMimeType || 'image/jpeg';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO support_contributions (
        id, support_code, user_id, donor_name, donor_email,
        amount, payment_method, proof_data, proof_mime_type, note,
        status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, 'QRIS', ?, ?, ?,
        'PENDING_VERIFICATION', datetime('now'), datetime('now')
      )
    `).run(
      id,
      supportCode,
      params.userId || null,
      cleanDonorName,
      cleanDonorEmail,
      amount,
      proof,
      mimeType,
      cleanNote
    );

    // Record audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, target_resource, target_id, details, created_at)
        VALUES (?, ?, 'USER', 'CREATE_SUPPORT_CONTRIBUTION', 'support_contributions', ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        params.userId || 'anonymous_donor',
        id,
        JSON.stringify({ supportCode, amount, donorName: cleanDonorName })
      );
    } catch {}

    // Dispatch operational notification to Admin Notify Bot (@notifynivabot)
    try {
      NotifyService.notifySystemAlert(
        '❤️ DUKUNGAN NIVA MASUK (QRIS)',
        `Support ID: ${supportCode}\nNominal: ${this.formatRupiah(amount)}\nNama: ${cleanDonorName || 'Teman NIVA'}\nCatatan: ${cleanNote || '-'}\nStatus: PENDING VERIFIKASI ADMIN\nBuka Admin Panel untuk memverifikasi.`,
        'MEDIUM'
      ).catch(() => {});
    } catch {}

    return {
      id,
      supportCode,
      support_code: supportCode,
      amount,
      formattedAmount: this.formatRupiah(amount),
      status: 'PENDING_VERIFICATION',
      donor_name: cleanDonorName || 'Teman NIVA',
      payment_method: 'QRIS',
      message: 'Bukti pembayaran berhasil dikirim dan sedang menunggu verifikasi admin.',
      createdAt: now,
      created_at: now
    };
  }

  /**
   * Retrieve contribution status safely by supportCode (for public lookup)
   */
  public static async getContributionByCode(supportCode: string): Promise<{
    supportCode: string;
    support_code: string;
    amount: number;
    formattedAmount: string;
    payment_method: string;
    status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
    donor_name: string;
    note: string | null;
    createdAt: string;
    created_at: string;
    verifiedAt: string | null;
    verified_at: string | null;
    rejectionReason: string | null;
    rejection_reason: string | null;
  } | null> {
    const db = getDatabase();
    const cleanCode = supportCode.trim().toUpperCase();

    const row = db.prepare(`
      SELECT support_code, amount, status, donor_name, note, payment_method, created_at, verified_at, rejection_reason
      FROM support_contributions
      WHERE support_code = ?
    `).get(cleanCode) as
      | {
          support_code: string;
          amount: number;
          status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
          donor_name: string | null;
          note: string | null;
          payment_method: string;
          created_at: string;
          verified_at: string | null;
          rejection_reason: string | null;
        }
      | undefined;

    if (!row) return null;

    return {
      supportCode: row.support_code,
      support_code: row.support_code,
      amount: row.amount,
      formattedAmount: this.formatRupiah(row.amount),
      payment_method: row.payment_method || 'QRIS',
      status: row.status,
      donor_name: row.donor_name || 'Teman NIVA',
      note: row.note,
      createdAt: row.created_at,
      created_at: row.created_at,
      verifiedAt: row.verified_at,
      verified_at: row.verified_at,
      rejectionReason: row.rejection_reason,
      rejection_reason: row.rejection_reason
    };
  }

  /**
   * Admin: Get all contributions with aggregated database statistics
   */
  public static async getAdminContributions(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    contributions: SupportContributionRecord[];
    stats: SupportStats;
  }> {
    const db = getDatabase();
    const limit = Math.min(filters?.limit || 50, 100);
    const offset = filters?.offset || 0;

    let query = 'SELECT * FROM support_contributions';
    const params: any[] = [];

    if (filters?.status && filters.status !== 'ALL') {
      query += ' WHERE status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params) as any[];
    const contributions: SupportContributionRecord[] = rows.map(r => ({
      ...r,
      payment_proof: r.proof_data
    }));

    // Calculate real stats from database
    const totalRow = db.prepare('SELECT COUNT(*) as count FROM support_contributions').get() as { count: number };
    const pendingRow = db.prepare("SELECT COUNT(*) as count FROM support_contributions WHERE status = 'PENDING_VERIFICATION'").get() as { count: number };
    const verifiedRow = db.prepare("SELECT COUNT(*) as count FROM support_contributions WHERE status = 'VERIFIED'").get() as { count: number };
    const rejectedRow = db.prepare("SELECT COUNT(*) as count FROM support_contributions WHERE status = 'REJECTED'").get() as { count: number };
    const sumRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM support_contributions WHERE status = 'VERIFIED'").get() as { total: number };

    const totalCount = Number(totalRow?.count || 0);
    const pendingCount = Number(pendingRow?.count || 0);
    const verifiedCount = Number(verifiedRow?.count || 0);
    const rejectedCount = Number(rejectedRow?.count || 0);
    const totalVerifiedAmount = Number(sumRow?.total || 0);

    return {
      contributions,
      stats: {
        total: totalCount,
        totalContributions: totalCount,
        pending: pendingCount,
        pendingCount,
        verified: verifiedCount,
        verifiedCount,
        rejected: rejectedCount,
        rejectedCount,
        total_verified_amount: totalVerifiedAmount,
        totalVerifiedAmount
      },
    };
  }

  /**
   * Admin: Verify contribution
   */
  public static async verifyContribution(
    id: string,
    adminId: string,
    adminNotes?: string
  ): Promise<SupportContributionRecord> {
    const db = getDatabase();

    const existing = db.prepare('SELECT * FROM support_contributions WHERE id = ?').get(id) as unknown as SupportContributionRecord | undefined;
    if (!existing) {
      throw new Error('Data dukungan tidak ditemukan.');
    }
    if (existing.status === 'VERIFIED') {
      throw new Error('Dukungan ini sudah berstatus VERIFIED.');
    }

    db.prepare(`
      UPDATE support_contributions
      SET status = 'VERIFIED',
          verified_by = ?,
          verified_at = datetime('now'),
          rejection_reason = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(adminId, id);

    // Audit trail
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, target_resource, target_id, details, created_at)
        VALUES (?, ?, 'ADMIN', 'SUPPORT_CONTRIBUTION_VERIFIED', 'support_contributions', ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        adminId,
        id,
        JSON.stringify({
          supportCode: existing.support_code,
          amount: existing.amount,
          adminNotes: adminNotes || null,
        })
      );
    } catch {}

    const updated = db.prepare('SELECT * FROM support_contributions WHERE id = ?').get(id) as any;
    return {
      ...updated,
      payment_proof: updated.proof_data
    };
  }

  /**
   * Admin: Reject contribution with mandatory reason
   */
  public static async rejectContribution(
    id: string,
    adminId: string,
    rejectionReason: string
  ): Promise<SupportContributionRecord> {
    const db = getDatabase();

    const cleanReason = rejectionReason?.trim();
    if (!cleanReason || cleanReason.length < 3) {
      throw new Error('Alasan penolakan wajib diisi (minimal 3 karakter).');
    }

    const existing = db.prepare('SELECT * FROM support_contributions WHERE id = ?').get(id) as unknown as SupportContributionRecord | undefined;
    if (!existing) {
      throw new Error('Data dukungan tidak ditemukan.');
    }

    db.prepare(`
      UPDATE support_contributions
      SET status = 'REJECTED',
          verified_by = ?,
          verified_at = datetime('now'),
          rejection_reason = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(adminId, cleanReason, id);

    // Audit trail
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, target_resource, target_id, details, created_at)
        VALUES (?, ?, 'ADMIN', 'SUPPORT_CONTRIBUTION_REJECTED', 'support_contributions', ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        adminId,
        id,
        JSON.stringify({
          supportCode: existing.support_code,
          amount: existing.amount,
          rejectionReason: cleanReason,
        })
      );
    } catch {}

    const updated = db.prepare('SELECT * FROM support_contributions WHERE id = ?').get(id) as any;
    return {
      ...updated,
      payment_proof: updated.proof_data
    };
  }

  /**
   * Retrieve active QRIS configuration from database
   */
  public static async getQrisConfig(): Promise<QrisConfig> {
    const db = getDatabase();
    try {
      const nameRow = db.prepare("SELECT value FROM system_settings WHERE key = 'support_qris_account_name'").get() as { value: string } | undefined;
      const instrRow = db.prepare("SELECT value FROM system_settings WHERE key = 'support_qris_instructions'").get() as { value: string } | undefined;
      const imgRow = db.prepare("SELECT value, updated_at FROM system_settings WHERE key = 'support_qris_image_data'").get() as { value: string; updated_at?: string } | undefined;

      const accountName = nameRow?.value || 'NIVA Indonesia (QRIS)';
      const instructions = instrRow?.value || 'Pindai kode QRIS resmi NIVA melalui aplikasi perbankan (BCA, Mandiri, BRI, BNI, dll.) atau e-Wallet (GoPay, OVO, Dana, ShopeePay). Pastikan nominal transfer sesuai dan simpan bukti transfer untuk diunggah.';
      const qrisImg = imgRow?.value || null;
      const updatedAt = imgRow?.updated_at || new Date().toISOString();

      return {
        account_name: accountName,
        accountName,
        instructions,
        image_data: qrisImg,
        qrisImageData: qrisImg,
        updated_at: updatedAt,
        updatedAt
      };
    } catch {
      return {
        account_name: 'NIVA Indonesia (QRIS)',
        accountName: 'NIVA Indonesia (QRIS)',
        instructions: 'Pindai kode QRIS resmi NIVA melalui aplikasi e-Wallet atau Mobile Banking Anda.',
        image_data: null,
        qrisImageData: null
      };
    }
  }

  /**
   * Admin: Update QRIS configuration (stored in system_settings, zero redeploy required)
   */
  public static async updateQrisConfig(
    params: {
      account_name?: string;
      accountName?: string;
      instructions?: string;
      image_data?: string | null;
      qrisImageData?: string | null;
    },
    adminId: string
  ): Promise<QrisConfig> {
    const db = getDatabase();

    const accountName = params.account_name || params.accountName;
    if (accountName) {
      db.prepare(`
        INSERT INTO system_settings (key, value, description, updated_by, updated_at)
        VALUES ('support_qris_account_name', ?, 'Nama pemilik rekening QRIS Support NIVA', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')
      `).run(accountName.trim(), adminId);
    }

    if (params.instructions) {
      db.prepare(`
        INSERT INTO system_settings (key, value, description, updated_by, updated_at)
        VALUES ('support_qris_instructions', ?, 'Petunjuk pembayaran QRIS', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')
      `).run(params.instructions.trim(), adminId);
    }

    const img = params.image_data !== undefined ? params.image_data : params.qrisImageData;
    if (img !== undefined) {
      db.prepare(`
        INSERT INTO system_settings (key, value, description, updated_by, updated_at)
        VALUES ('support_qris_image_data', ?, 'Gambar QRIS resmi Support NIVA (Base64 atau URL)', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')
      `).run(img, adminId);
    }

    // Record audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, target_resource, target_id, details, created_at)
        VALUES (?, ?, 'ADMIN', 'UPDATE_SUPPORT_QRIS_CONFIG', 'system_settings', 'support_qris', ?, datetime('now'))
      `).run(uuidv4(), adminId, JSON.stringify({ accountName }));
    } catch {}

    return this.getQrisConfig();
  }
}

export const supportContributionService = SupportContributionService;
