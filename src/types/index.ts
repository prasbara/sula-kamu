// NIVA Platform Type Definitions

export type InstitutionType = 'UNIVERSITY' | 'POLYTECHNIC' | 'HEALTH_ACADEMY';

export interface Institution {
  id: string;
  name: string;
  short_name: string;
  type: InstitutionType;
  campus_cluster: string;
  is_active: number;
  created_at?: string;
}

export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type UserVerificationStatus =
  | 'UNVERIFIED'
  | 'PHOTO_PENDING'
  | 'PHOTO_VERIFIED'
  | 'KTM_PENDING'
  | 'KTM_VERIFIED'
  | 'VERIFICATION_REJECTED'
  | 'VERIFICATION_REVIEW';

export type SubscriptionStatus =
  | 'FREE'
  | 'PREMIUM_PENDING'
  | 'PREMIUM_ACTIVE'
  | 'PREMIUM_EXPIRED'
  | 'PREMIUM_REVOKED';

export type PaymentStatus =
  | 'NONE'
  | 'PENDING'
  | 'PROOF_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

export interface User {
  id: string;
  telegram_id: string;
  status: AccountStatus;
  verification_status: UserVerificationStatus;
  subscription_status: SubscriptionStatus;
  is_18_plus: number;
  birth_date: string | null;
  risk_score: number;
  onboarding_completed_at?: string | null;
  bot_state?: 'NEW' | 'ONBOARDING' | 'READY' | 'SEARCHING' | 'MATCHED' | 'CHATTING' | 'COMPLETED' | 'COOLDOWN';
  online_status?: 'ONLINE' | 'OFFLINE' | 'AWAY';
  last_seen_at?: string | null;
  active_session_id?: string | null;
  telegram_username?: string | null;
  telegram_display_name?: string | null;
  created_at: string;
  updated_at: string;
}

export type RelationshipIntent = 'DATING' | 'NEW_FRIENDS' | 'STUDY_BUDDY' | 'SERIOUS_RELATIONSHIP';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  age: number;
  institution_id: string;
  study_field: string;
  bio: string | null;
  interests: string[]; // parsed from JSON
  relationship_intent: RelationshipIntent;
  coarse_area: string | null;
  photo_file_id: string | null;
  is_active: number;
  created_at?: string;
  updated_at?: string;
  // joined fields
  institution_name?: string;
  institution_short_name?: string;
}

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEEDS_REVIEW' | 'SUSPENDED';

export interface StudentVerification {
  id: string;
  user_id: string;
  institution_id: string;
  status: VerificationStatus;
  card_hash: string;
  ocr_extracted_text: string | null;
  ocr_confidence: number;
  review_notes: string | null;
  reviewer_id: string | null;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhotoVerification {
  id: string;
  user_id: string;
  photo_hash: string;
  status: 'PHOTO_PENDING' | 'PHOTO_VERIFIED' | 'REJECTED';
  review_notes?: string | null;
  reviewer_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationAttempt {
  id: string;
  user_id: string;
  card_hash: string;
  status: 'SUCCESS' | 'FAILED_DUPLICATE' | 'FAILED_OCR' | 'NEEDS_REVIEW' | 'RATE_LIMITED';
  failure_reason: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  is_active: number;
  unmatched_by: string | null;
  unmatched_reason: string | null;
  created_at: string;
  updated_at: string;
  other_profile?: Profile;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: number;
  created_at: string;
}

export type ReportCategory =
  | 'HARASSMENT'
  | 'SCAM'
  | 'FAKE_IDENTITY'
  | 'SEXUAL_HARASSMENT'
  | 'THREAT'
  | 'SPAM'
  | 'IMPERSONATION'
  | 'INAPPROPRIATE_CONTENT'
  | 'OTHER';

export type ReportStatus = 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';

export interface Report {
  id: string;
  report_code: string;
  reporter_id: string;
  reported_id: string;
  category: ReportCategory;
  evidence_text: string | null;
  evidence_media_id: string | null;
  status: ReportStatus;
  assigned_moderator_id: string | null;
  moderator_notes: string | null;
  resolution_action: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  badge_label: string;
  is_active: number;
  created_at?: string;
}

export interface PaymentRequest {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  payment_method: string;
  status: PaymentStatus;
  proof_image_path: string | null;
  proof_submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  payment_id: string | null;
  plan_id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'PAYMENT_ADMIN'
  | 'VERIFICATION_ADMIN'
  | 'MODERATOR'
  | 'SUPPORT_ADMIN'
  | 'AUDITOR'
  | 'VERIFICATION_REVIEWER'
  | 'SUPPORT';

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  role: AdminRole;
  is_active: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_resource: string;
  target_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

// ── Stranger Chat & Production Moderation Engine ───────────────────────────

export type ModerationCategory =
  | 'PHONE_NUMBER'
  | 'EXTERNAL_CONTACT'
  | 'FINANCIAL_SCAM'
  | 'CREDENTIAL_THEFT'
  | 'PHISHING_URL'
  | 'ROMANCE_SCAM'
  | 'DANGEROUS_CONTENT'
  | 'SPAM_FLOODING'
  | 'USER_REPORT'
  | 'OTHER';

export type ModerationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ModerationAction =
  | 'ALLOW'
  | 'WARN'
  | 'REDACT'
  | 'BLOCK_MESSAGE'
  | 'BLOCK_SESSION'
  | 'TEMP_RESTRICT'
  | 'ACCOUNT_BLOCK';

export type ModerationReviewStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

export interface ModerationEvent {
  id: string;
  user_id: string;
  session_id: string | null;
  message_id: string | null;
  category: ModerationCategory;
  severity: ModerationSeverity;
  action: ModerationAction;
  strike_count: number;
  risk_score: number;
  evidence_snippet: string | null;
  created_at: string;
  expires_at: string | null;
  review_status: ModerationReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export type RestrictionType = 'NONE' | 'WARNING' | 'TEMP_RESTRICT' | 'BANNED';

export interface UserRestriction {
  user_id: string;
  restriction_type: RestrictionType;
  active_strikes: number;
  restricted_until: string | null;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface ContentModerationResult {
  allowed: boolean;
  action: ModerationAction;
  severity: ModerationSeverity;
  category: ModerationCategory | null;
  riskScore: number;
  flags: string[];
  redactedContent?: string;
  warningMessage?: string;
  strikeEscalation?: boolean;
  immediateActionRequired?: boolean;
}

export interface StrangerChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  isRedacted: boolean;
  timestamp: string;
  systemWarning?: string;
}

