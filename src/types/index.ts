// SULA Type Definitions

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

export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';

export interface User {
  id: string;
  telegram_id: string;
  status: UserStatus;
  is_18_plus: number;
  birth_date: string | null;
  risk_score: number;
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

export type AdminRole = 'SUPER_ADMIN' | 'VERIFICATION_REVIEWER' | 'MODERATOR' | 'SUPPORT' | 'AUDITOR';

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
