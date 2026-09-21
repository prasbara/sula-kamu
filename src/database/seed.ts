import { getDatabase, initDatabase } from './db.js';
import crypto from 'node:crypto';

export function seedDatabase(): void {
  initDatabase();
  const db = getDatabase();

  // 1. Seed Institutions
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM institutions');
  const countRow = countStmt.get() as { count: number };

  if (countRow.count === 0) {
    const insertInst = db.prepare(`
      INSERT INTO institutions (id, name, short_name, type, campus_cluster, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const institutionsList = [
      // Universities
      { id: 'inst-undip', name: 'Universitas Diponegoro', short_name: 'UNDIP', type: 'UNIVERSITY', campus_cluster: 'Tembalang / Pleburan' },
      { id: 'inst-unnes', name: 'Universitas Negeri Semarang', short_name: 'UNNES', type: 'UNIVERSITY', campus_cluster: 'Sekaran / Gunungpati' },
      { id: 'inst-uin-walisongo', name: 'UIN Walisongo Semarang', short_name: 'UIN Walisongo', type: 'UNIVERSITY', campus_cluster: 'Ngaliyan' },
      { id: 'inst-udinus', name: 'Universitas Dian Nuswantoro', short_name: 'UDINUS', type: 'UNIVERSITY', campus_cluster: 'Pendrikan Kidul / Semarang Tengah' },
      { id: 'inst-unissula', name: 'Universitas Islam Sultan Agung', short_name: 'UNISSULA', type: 'UNIVERSITY', campus_cluster: 'Kaligawe / Genuk' },
      { id: 'inst-unika', name: 'Universitas Katolik Soegijapranata', short_name: 'SCU (UNIKA)', type: 'UNIVERSITY', campus_cluster: 'Bendan Dhuwur / BSB City' },
      { id: 'inst-unimus', name: 'Universitas Muhammadiyah Semarang', short_name: 'UNIMUS', type: 'UNIVERSITY', campus_cluster: 'Kedungmundu / Tembalang' },
      { id: 'inst-usm', name: 'Universitas Semarang', short_name: 'USM', type: 'UNIVERSITY', campus_cluster: 'Tlogosari / Pedurungan' },
      { id: 'inst-unwahas', name: 'Universitas Wahid Hasyim', short_name: 'UNWAHAS', type: 'UNIVERSITY', campus_cluster: 'Sampangan / Gunungpati' },
      { id: 'inst-upgris', name: 'Universitas PGRI Semarang', short_name: 'UPGRIS', type: 'UNIVERSITY', campus_cluster: 'Sidodadi / Semarang Timur' },
      { id: 'inst-unisbank', name: 'Universitas Stikubank', short_name: 'UNISBANK', type: 'UNIVERSITY', campus_cluster: 'Mugas / Kendeng' },
      { id: 'inst-unaki', name: 'Universitas AKI', short_name: 'UNAKI', type: 'UNIVERSITY', campus_cluster: 'Imam Bonjol / Semarang Tengah' },
      { id: 'inst-ivet', name: 'Universitas Ivet', short_name: 'UNIVET', type: 'UNIVERSITY', campus_cluster: 'Sampangan' },
      { id: 'inst-unkaha', name: 'Universitas Karya Husada Semarang', short_name: 'UNKAHA', type: 'UNIVERSITY', campus_cluster: 'Kompol Maksum' },
      { id: 'inst-telogorejo', name: 'Universitas Telogorejo', short_name: 'Telogorejo', type: 'UNIVERSITY', campus_cluster: 'Puri Anjasmoro' },
      { id: 'inst-stekom', name: 'Universitas Sains dan Teknologi Komputer', short_name: 'STEKOM', type: 'UNIVERSITY', campus_cluster: 'Majapahit' },
      { id: 'inst-pandanaran', name: 'Universitas Pandanaran', short_name: 'UNPAND', type: 'UNIVERSITY', campus_cluster: 'Banjarsari / Tembalang' },
      { id: 'inst-untag', name: 'Universitas 17 Agustus 1945 Semarang', short_name: 'UNTAG Semarang', type: 'UNIVERSITY', campus_cluster: 'Bendan Dhuwur / Gajahmungkur' },

      // Polytechnics and Service Institutions
      { id: 'inst-polines', name: 'Politeknik Negeri Semarang', short_name: 'POLINES', type: 'POLYTECHNIC', campus_cluster: 'Tembalang' },
      { id: 'inst-polimarin', name: 'Politeknik Maritim Negeri Indonesia', short_name: 'POLIMARIN', type: 'POLYTECHNIC', campus_cluster: 'Bendan Dhuwur' },
      { id: 'inst-polpu', name: 'Politeknik Pekerjaan Umum', short_name: 'Politeknik PU', type: 'POLYTECHNIC', campus_cluster: 'Tembalang' },
      { id: 'inst-pip', name: 'Politeknik Ilmu Pelayaran Semarang', short_name: 'PIP Semarang', type: 'POLYTECHNIC', campus_cluster: 'Singosari / Semarang Selatan' },
      { id: 'inst-akpol', name: 'Akademi Kepolisian', short_name: 'AKPOL', type: 'POLYTECHNIC', campus_cluster: 'Gajahmungkur' },
      { id: 'inst-polteka', name: 'Politeknik Katolik Mangunwijaya', short_name: 'POLTEKA', type: 'POLYTECHNIC', campus_cluster: 'Tlogosari' },
      { id: 'inst-binatrada', name: 'Politeknik Bina Trada Semarang', short_name: 'Bina Trada', type: 'POLYTECHNIC', campus_cluster: 'Banyumanik' },
      { id: 'inst-stibisnis', name: 'Politeknik STiBISNIS Semarang', short_name: 'STiBISNIS', type: 'POLYTECHNIC', campus_cluster: 'Semarang Barat' },

      // Health Institutions
      { id: 'inst-poltekkes', name: 'Poltekkes Kemenkes Semarang', short_name: 'Poltekkes Semarang', type: 'HEALTH_ACADEMY', campus_cluster: 'Tirto Agung / Banyumanik' },
      { id: 'inst-stikes-smg', name: 'STIKES Semarang', short_name: 'STIKES Semarang', type: 'HEALTH_ACADEMY', campus_cluster: 'Pedurungan' },
      { id: 'inst-st-elisabeth', name: 'STIKES St. Elisabeth Semarang', short_name: 'STIKES Elisabeth', type: 'HEALTH_ACADEMY', campus_cluster: 'Kawi / Candi' },
      { id: 'inst-hakli', name: 'STIKES Hakli Semarang', short_name: 'STIKES Hakli', type: 'HEALTH_ACADEMY', campus_cluster: 'Gajahmungkur' },
      { id: 'inst-kesdam', name: 'STIKES Kesdam IV/Diponegoro', short_name: 'STIKES Kesdam', type: 'HEALTH_ACADEMY', campus_cluster: 'Watugong / Banyumanik' },
      { id: 'inst-stifar', name: 'Sekolah Tinggi Ilmu Farmasi Semarang', short_name: 'STIFAR Semarang', type: 'HEALTH_ACADEMY', campus_cluster: 'Plamongansari' },
      { id: 'inst-widya-husada', name: 'Universitas Widya Husada Semarang', short_name: 'UWHS', type: 'HEALTH_ACADEMY', campus_cluster: 'Subali Raya / Krapyak' },
    ];

    for (const inst of institutionsList) {
      insertInst.run(inst.id, inst.name, inst.short_name, inst.type, inst.campus_cluster);
    }
  }

  // 2. Seed Emergency Switches & Product Configurations
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value, description)
    VALUES (?, ?, ?)
  `);
  insertSetting.run('registrations_enabled', 'true', 'Global kill switch for new registrations');
  insertSetting.run('matchmaking_enabled', 'true', 'Global switch to pause matchmaking discovery');
  insertSetting.run('verification_enabled', 'true', 'Global switch for KTM verification uploads');
  insertSetting.run('pricing_phase', 'EARLY_ACCESS', 'Active subscription pricing phase (EARLY_ACCESS, EARLY_LAUNCH, NORMAL)');

  // 3. Seed Public Statistics Singleton
  db.exec(`
    INSERT OR IGNORE INTO public_statistics (id, students_joined_total, updated_at)
    VALUES ('singleton', (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'), datetime('now'));
  `);

  // 4. Seed Subscription Plans
  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO subscription_plans (id, name, price, duration_days, badge_label, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  insertPlan.run('early_access', 'Early Access', 5000, 30, 'EARLY ACCESS');
  insertPlan.run('early_launch', 'Early Launch', 8000, 30, 'EARLY LAUNCH');

  // 5. Seed Admin Users (with SHA-256 hashed passwords)
  const adminCountStmt = db.prepare('SELECT COUNT(*) as count FROM admin_users');
  const adminCount = adminCountStmt.get() as { count: number };

  if (adminCount.count === 0) {
    const insertAdmin = db.prepare(`
      INSERT INTO admin_users (id, username, password_hash, display_name, role)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Standard hash for seed admin accounts (Default seed: 'SulaAdmin2026!')
    const hash = crypto.createHash('sha256').update('SulaAdmin2026!').digest('hex');

    insertAdmin.run('admin-super-01', 'superadmin', hash, 'NIVA Head Admin', 'SUPER_ADMIN');
    insertAdmin.run('admin-pay-01', 'payment1', hash, 'Payment Reviewer 1', 'PAYMENT_ADMIN');
    insertAdmin.run('admin-verifier-01', 'verifier1', hash, 'Verification Admin 1', 'VERIFICATION_ADMIN');
    insertAdmin.run('admin-mod-01', 'moderator1', hash, 'Trust & Safety Moderator', 'MODERATOR');
    insertAdmin.run('admin-support-01', 'support1', hash, 'Support Specialist 1', 'SUPPORT_ADMIN');
    insertAdmin.run('admin-auditor-01', 'auditor1', hash, 'Compliance Auditor', 'AUDITOR');
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase();
  console.log('Database successfully initialized and seeded with 33 Semarang institutions, statistics, plans, and admin roles.');
}
