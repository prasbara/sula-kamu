import { Bot, Context, InlineKeyboard, session, SessionFlavor } from 'grammy';
import { config } from '../config/index.js';
import { getDatabase } from '../database/db.js';
import { OnboardingHandler } from './handlers/onboarding.js';
import { ProfileHandler, SEMARANG_AREAS, AVAILABLE_INTERESTS } from './handlers/profile.js';
import { DiscoveryHandler } from './handlers/discovery.js';
import { MatchesHandler } from './handlers/matches.js';
import { SafetyHandler } from './handlers/safety.js';
import { SettingsHandler } from './handlers/settings.js';
import { VerificationService } from '../services/verification/verificationService.js';
import { MatchingService } from '../services/matchmaking/matchingService.js';
import { ModerationService } from '../services/safety/moderationService.js';
import { Institution, Profile, User } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

import { PhotoModerationService } from '../services/safety/photoModerationService.js';

export interface SessionData {
  step:
    | 'IDLE'
    | 'AWAITING_AGE'
    | 'AWAITING_INSTITUTION'
    | 'AWAITING_KTM_UPLOAD'
    | 'AWAITING_PROFILE_NAME'
    | 'AWAITING_PROFILE_MAJOR'
    | 'AWAITING_PROFILE_BIO'
    | 'AWAITING_PROFILE_PHOTO'
    | 'AWAITING_CHAT_MESSAGE';
  selectedInstitutionId?: string;
  pendingName?: string;
  pendingMajor?: string;
  activeChatMatchId?: string;
  activeChatPartnerId?: string;
  activeReportTargetId?: string;
}

export type MyContext = Context & SessionFlavor<SessionData>;

export function createBot(): Bot<MyContext> {
  if (!config.TELEGRAM_BOT_TOKEN) {
    console.warn('WARNING: TELEGRAM_BOT_TOKEN not provided in .env. Bot instance created in dormant mode.');
  }

  const bot = new Bot<MyContext>(config.TELEGRAM_BOT_TOKEN || 'DORMANT_TOKEN_FOR_TESTING');

  // Global Error Handler
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`, err.error);
  });

  // Session storage middleware
  bot.use(
    session({
      initial: (): SessionData => ({ step: 'IDLE' }),
    })
  );

  // Global Anti-Spam / Rate Limiting Middleware
  const userRateMap = new Map<number, { count: number; lastReset: number }>();
  bot.use(async (ctx, next) => {
    const fromId = ctx.from?.id;
    if (fromId) {
      const now = Date.now();
      const userRate = userRateMap.get(fromId) || { count: 0, lastReset: now };
      if (now - userRate.lastReset > 60000) {
        userRate.count = 1;
        userRate.lastReset = now;
      } else {
        userRate.count++;
      }
      userRateMap.set(fromId, userRate);

      if (userRate.count > 45) {
        await ctx.reply('⚠️ Anda mengirim pesan terlalu cepat. Silakan tunggu 1 menit.');
        return;
      }
    }
    await next();
  });

  // /start command
  bot.command('start', async (ctx) => {
    const telegramId = ctx.from?.id.toString() || '';
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    // Check emergency switch
    const regRow = db.prepare("SELECT value FROM system_settings WHERE key = 'registrations_enabled'").get() as { value: string } | undefined;
    if (regRow && regRow.value === 'false') {
      await ctx.reply('⚠️ Pendaftaran pengguna baru SULA saat ini sedang ditutup sementara untuk peningkatan kapasitas sistem.');
      return;
    }

    if (user.status === 'BANNED') {
      await ctx.reply('⛔ Akun Anda telah ditangguhkan secara permanen karena pelanggaran terhadap Community Guidelines SULA.');
      return;
    }

    // Check if user is already verified and has profile
    const verif = db.prepare('SELECT * FROM student_verifications WHERE user_id = ?').get(user.id) as any;
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id) as any;

    if (verif && verif.status === 'VERIFIED' && profile) {
      await ctx.reply(
        `Selamat datang kembali di SULA, *${profile.display_name}*!\n\n` +
        `Gunakan tombol di bawah untuk mulai menemukan teman atau mengelola akun Anda:`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('❤️ Discover (Temukan Teman)', 'cmd_discover')
            .text('💬 Matches Saya', 'cmd_matches')
            .row()
            .text('👤 Profil Saya', 'cmd_my_profile')
            .text('🛡 Pusat Keamanan', 'cmd_safety')
            .row()
            .text('⚙ Pengaturan', 'cmd_settings'),
        }
      );
      return;
    }

    // New user onboarding flow
    ctx.session.step = 'AWAITING_AGE';
    await ctx.reply(OnboardingHandler.getWelcomeMessage(), {
      parse_mode: 'Markdown',
      reply_markup: OnboardingHandler.getAgeGateKeyboard(),
    });
  });

  // Age gate callbacks
  bot.callbackQuery('age_gate_accept', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const db = getDatabase();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    db.prepare("UPDATE users SET is_18_plus = 1, updated_at = datetime('now') WHERE id = ?").run(user.id);
    ctx.session.step = 'AWAITING_INSTITUTION';

    await ctx.editMessageText(
      `🏛 *Langkah 1: Pilih Kampus Anda*\n\n` +
      `Silakan pilih institusi pendidikan tinggi Anda di Semarang untuk verifikasi kartu mahasiswa:`,
      {
        parse_mode: 'Markdown',
        reply_markup: OnboardingHandler.getInstitutionKeyboard(0),
      }
    );
  });

  bot.callbackQuery('age_gate_reject', async (ctx) => {
    await ctx.editMessageText(
      `❌ *Akses Dibatasi (18+ Only)*\n\n` +
      `SULA dikhususkan untuk mahasiswa dewasa berusia 18 tahun ke atas. ` +
      `Terima kasih atas minat Anda, kami menunggu Anda setelah genap berusia 18 tahun!`,
      { parse_mode: 'Markdown' }
    );
  });

  // Institution pagination
  bot.callbackQuery(/inst_page_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    await ctx.editMessageReplyMarkup({
      reply_markup: OnboardingHandler.getInstitutionKeyboard(page),
    });
  });

  // Institution selection
  bot.callbackQuery(/select_inst_(.+)/, async (ctx) => {
    const instId = ctx.match[1];
    const db = getDatabase();
    const inst = db.prepare('SELECT * FROM institutions WHERE id = ?').get(instId) as Institution | undefined;

    if (!inst) {
      await ctx.reply('Institusi tidak ditemukan.');
      return;
    }

    ctx.session.selectedInstitutionId = inst.id;
    ctx.session.step = 'AWAITING_KTM_UPLOAD';

    await ctx.editMessageText(
      `🎓 *Kampus Terpilih:* ${inst.name} (${inst.short_name})\n\n` +
      `📸 *Langkah 2: Unggah Foto Kartu Tanda Mahasiswa (KTM)*\n\n` +
      `Demi menjaga keamanan seluruh mahasiswa di Semarang, silakan kirimkan foto KTM Anda.\n\n` +
      `🔒 *Jaminan Keamanan Privasi SULA:*\n` +
      `• Metadata EXIF & GPS langsung dihapus saat file diterima.\n` +
      `• Foto diproses secara terenkripsi hanya untuk ekstraksi nama & status mahasiswa.\n` +
      `• *NIM dan foto KTM TIDAK PERNAH disimpan permanen* atau diperlihatkan kepada orang lain.\n\n` +
      `_Silakan kirimkan foto KTM Anda sekarang (sebagai Foto di Telegram):_`,
      { parse_mode: 'Markdown' }
    );
  });

  // Photo upload handler (KTM verification)
  bot.on(':photo', async (ctx) => {
    if (!ctx.from || !ctx.message || !ctx.message.photo) return;

    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    // 1. Profile Photo Upload & Safety Moderation Handler
    if (ctx.session.step === 'AWAITING_PROFILE_PHOTO') {
      const statusMsg = await ctx.reply('⏳ Memeriksa foto profil dengan sistem moderasi kesopanan otomatis...');

      try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.api.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const inspection = await PhotoModerationService.inspectProfilePhoto(buffer);

        if (!inspection.isApproved) {
          await ctx.api.editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            `❌ *Foto Profil Tidak Disetujui*\n\n${inspection.rejectionReason}\n\n_Silakan unggah foto wajah asli yang berpakaian sopan._`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Save approved photo_file_id
        db.prepare("UPDATE profiles SET photo_file_id = ?, updated_at = datetime('now') WHERE user_id = ?").run(photo.file_id, user.id);
        ctx.session.step = 'IDLE';

        const updatedProfile = db.prepare(`
          SELECT p.*, i.short_name as inst_short 
          FROM profiles p 
          JOIN institutions i ON i.id = p.institution_id 
          WHERE p.user_id = ?
        `).get(user.id) as any;

        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          `✅ *Foto Profil Berhasil Disetujui & Diperbarui!*\n\n` +
          `Foto Anda telah lolos filter moderasi kesopanan & bebas konten eksplisit/nude.\n\n` +
          ProfileHandler.renderProfilePreview(updatedProfile, updatedProfile.inst_short),
          {
            parse_mode: 'Markdown',
            reply_markup: ProfileHandler.getProfileKeyboard(),
          }
        );
      } catch (err: any) {
        console.error('Error during profile photo moderation:', err);
        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          'Terjadi kendala saat memproses foto profil. Silakan coba kirim ulang.'
        );
      }
      return;
    }

    if (ctx.session.step !== 'AWAITING_KTM_UPLOAD') {
      return;
    }

    const instId = ctx.session.selectedInstitutionId;

    if (!instId) {
      await ctx.reply('Silakan pilih institusi kampus terlebih dahulu dengan mengetik /start.');
      return;
    }

    const statusMsg = await ctx.reply('⏳ Sedang memproses dan menganalisis foto KTM Anda dengan aman...');

    try {
      // Get highest resolution photo
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const file = await ctx.api.getFile(photo.file_id);
      
      // Download photo buffer
      const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Fetch user profile name or default to Telegram first name
      const declaredName = ctx.from.first_name || 'Mahasiswa';

      const result = await VerificationService.processKtmSubmission(user.id, instId, declaredName, buffer);

      if (result.success) {
        ctx.session.step = 'AWAITING_PROFILE_MAJOR';
        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          `✅ *${result.userFacingMessage}*\n\n` +
          `Langkah selanjutnya: Buat profil mahasiswa Anda.\n` +
          `Ketik *Jurusan / Program Studi* Anda (misal: Teknik Informatika, Manajemen, Hukum, dll):`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          `❌ *Verifikasi Belum Berhasil*\n\n${result.userFacingMessage}\n\n` +
          `Silakan unggah ulang foto KTM yang lebih jelas atau ketik /start untuk mengulang.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (err: any) {
      console.error('Error during photo verification:', err);
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        'Terjadi kendala saat mengunduh/memproses foto. Silakan coba kirim ulang.'
      );
    }
  });

  // Text message handlers for Profile Setup
  bot.on(':text', async (ctx) => {
    if (!ctx.from || !ctx.message || !ctx.message.text) return;
    const text = ctx.message.text.trim();
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    // In-chat mediated messaging
    if (ctx.session.step === 'AWAITING_CHAT_MESSAGE' && ctx.session.activeChatMatchId) {
      const matchId = ctx.session.activeChatMatchId;
      try {
        const sanitized = ProfileHandler.sanitizeBio(text);
        if (sanitized.hasSuspiciousPatterns) {
          await ctx.reply('⚠️ Pesan mengandung nomor HP atau tautan eksternal. Demi keselamatan, gunakan obrolan internal SULA.');
          return;
        }

        MatchingService.sendMatchMessage(matchId, user.id, sanitized.cleanText);
        await ctx.reply('✅ Pesan berhasil dikirim!');
        ctx.session.step = 'IDLE';
      } catch (err: any) {
        await ctx.reply(`❌ Gagal mengirim pesan: ${err.message}`);
      }
      return;
    }

    if (ctx.session.step === 'AWAITING_PROFILE_MAJOR') {
      ctx.session.pendingMajor = text.slice(0, 50);
      ctx.session.step = 'AWAITING_PROFILE_BIO';

      await ctx.reply(
        `Bagus! Jurusan Anda dicatat: *${ctx.session.pendingMajor}*.\n\n` +
        `Sekarang tuliskan *Bio singkat* tentang diri Anda (maksimal 200 karakter).\n` +
        `_Catatan: Jangan menyertakan nomor HP atau username akun medsos demi keamanan._`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (ctx.session.step === 'AWAITING_PROFILE_BIO') {
      const { cleanText, hasSuspiciousPatterns } = ProfileHandler.sanitizeBio(text);
      if (hasSuspiciousPatterns) {
        await ctx.reply('⚠️ Bio terdeteksi memuat nomor HP atau link luar. Mohon tulis bio tentang hobi/karakter Anda tanpa data kontak.');
        return;
      }

      // Create or update profile
      const instId = ctx.session.selectedInstitutionId || 'inst-undip';
      const existingProfile = db.prepare('SELECT id FROM profiles WHERE user_id = ?').get(user.id);
      
      const interestsJson = JSON.stringify(['Coding & Tech', 'Ngopi / Cafe Hopping', 'Music & Concerts']);

      if (existingProfile) {
        db.prepare(`
          UPDATE profiles 
          SET study_field = ?, bio = ?, updated_at = datetime('now')
          WHERE user_id = ?
        `).run(ctx.session.pendingMajor || 'Mahasiswa', cleanText, user.id);
      } else {
        db.prepare(`
          INSERT INTO profiles (
            id, user_id, display_name, age, institution_id,
            study_field, bio, interests, relationship_intent, coarse_area
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DATING', 'Tembalang')
        `).run(
          uuidv4(),
          user.id,
          ctx.from.first_name || 'Teman Sula',
          20,
          instId,
          ctx.session.pendingMajor || 'Mahasiswa',
          cleanText,
          interestsJson
        );
      }

      ctx.session.step = 'IDLE';
      const savedProfile = db.prepare(`
        SELECT p.*, i.short_name as inst_short 
        FROM profiles p 
        JOIN institutions i ON i.id = p.institution_id 
        WHERE p.user_id = ?
      `).get(user.id) as any;

      await ctx.reply(
        `🎉 *Profil Anda Berhasil Disimpan!*\n\n` +
        ProfileHandler.renderProfilePreview(savedProfile, savedProfile.inst_short),
        {
          parse_mode: 'Markdown',
          reply_markup: ProfileHandler.getProfileKeyboard(),
        }
      );
      return;
    }
  });

  // Discovery Action
  bot.callbackQuery('cmd_discover', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    const remaining = MatchingService.getDailyLikesRemaining(user.id);
    const queue = MatchingService.getDiscoveryQueue(user.id, 1);

    if (queue.length === 0) {
      await ctx.reply(
        `✨ *Belum Ada Profil Baru Saat Ini*\n\n` +
        `Anda telah melihat semua profil mahasiswa terverifikasi yang tersedia saat ini atau kuota discover telah terpenuhi.\n` +
        `Silakan periksa kembali nanti!`,
        {
          reply_markup: new InlineKeyboard()
            .text('💬 Lihat Matches Saya', 'cmd_matches')
            .text('👤 Profil Saya', 'cmd_my_profile'),
        }
      );
      return;
    }

    const candidate = queue[0];
    await DiscoveryHandler.sendCard(ctx, candidate, remaining);
  });

  // Like Callback
  bot.callbackQuery(/like_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    try {
      const result = MatchingService.handleLike(user.id, targetUserId);

      if (result.isMatch && result.matchedProfile) {
        await ctx.reply(DiscoveryHandler.renderMutualMatchMessage(result.matchedProfile), {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('💬 Buka Chat Sekarang', `open_chat_${result.matchId}`)
            .row()
            .text('❤️ Lanjut Discover', 'cmd_discover'),
        });
      } else {
        await ctx.reply('❤️ Suka terkirim! Menampilkan profil berikutnya...');
        // Show next candidate
        const queue = MatchingService.getDiscoveryQueue(user.id, 1);
        if (queue.length > 0) {
          await DiscoveryHandler.sendCard(ctx, queue[0], result.remainingLikes);
        }
      }
    } catch (err: any) {
      await ctx.reply(`⚠️ ${err.message}`);
    }
  });

  // Pass Callback
  bot.callbackQuery(/pass_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    MatchingService.handlePass(user.id, targetUserId);
    const remaining = MatchingService.getDailyLikesRemaining(user.id);

    const queue = MatchingService.getDiscoveryQueue(user.id, 1);
    if (queue.length > 0) {
      await DiscoveryHandler.sendCard(ctx, queue[0], remaining);
    } else {
      await ctx.reply('✨ Anda telah melihat semua kandidat saat ini!');
    }
  });

  // Matches Callback
  bot.callbackQuery('cmd_matches', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    const matches = MatchingService.getUserMatches(user.id);
    const { text, keyboard } = MatchesHandler.renderMatchesList(matches);

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  // Open Chat Room
  bot.callbackQuery(/open_chat_(.+)/, async (ctx) => {
    const matchId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as any;
    if (!match) {
      await ctx.reply('Match tidak ditemukan.');
      return;
    }

    const partnerId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;
    const partnerProfile = MatchingService.getProfileByUserId(partnerId);

    // Fetch message history (last 5 messages)
    const messages = db.prepare(`
      SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC LIMIT 10
    `).all(matchId) as any[];

    let chatText = `💬 *Ruang Obrolan Aman SULA*\n` +
      `Dengan: *${partnerProfile?.displayName}* (${partnerProfile?.institutionShortName})\n\n`;

    if (messages.length === 0) {
      chatText += `_Belum ada pesan. Mulailah menyapa teman baru Anda!_\n\n`;
    } else {
      for (const m of messages) {
        const isMe = m.sender_id === user.id;
        chatText += `${isMe ? '👤 Anda' : '💬 ' + partnerProfile?.displayName}: ${m.content}\n`;
      }
      chatText += '\n';
    }

    chatText += `🔒 Obrolan dimediasi oleh platform SULA demi menjaga kerahasiaan nomor telepon & username Anda.`;

    await ctx.reply(chatText, {
      parse_mode: 'Markdown',
      reply_markup: MatchesHandler.getChatSafetyKeyboard(matchId, partnerId),
    });
  });

  // Reply message prompt
  bot.callbackQuery(/reply_msg_(.+)/, async (ctx) => {
    const matchId = ctx.match[1];
    ctx.session.activeChatMatchId = matchId;
    ctx.session.step = 'AWAITING_CHAT_MESSAGE';

    await ctx.reply('✍️ Ketik balasan Anda lalu kirimkan:');
  });

  // Block user callback
  bot.callbackQuery(/block_user_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    ModerationService.blockUser(user.id, targetUserId, 'Blocked via Safety Action Bar');
    await ctx.reply('🚫 Pengguna telah diblokir. Hubungan match dan percakapan telah ditutup.');
  });

  // Report Flow
  bot.callbackQuery(/report_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    await ctx.reply(
      `🚨 *Laporan Akun / Kasus*\n\n` +
      `Pilih kategori pelanggaran yang ingin Anda laporkan. Identitas Anda dirahasiakan sepenuhnya:`,
      {
        parse_mode: 'Markdown',
        reply_markup: SafetyHandler.getReportCategoryKeyboard(targetUserId),
      }
    );
  });

  bot.callbackQuery(/submit_report_(.+)_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    const category = ctx.match[2] as any;
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    const report = ModerationService.createReport({
      reporterUserId: user.id,
      reportedUserId: targetUserId,
      category,
      evidenceText: 'Reported directly from chat / discovery action bar',
    });

    await ctx.reply(
      `✅ *Laporan Anda Telah Diterima*\n` +
      `Nomor Kasus: \`${report.report_code}\`\n\n` +
      `Pengguna telah otomatis diblokir dari akun Anda demi keamanan. ` +
      `Tim Trust & Safety kami akan segera meninjau kasus ini secara obyektif.`,
      { parse_mode: 'Markdown' }
    );
  });

  // Safety Charter info
  bot.callbackQuery('safety_tips_info', async (ctx) => {
    await ctx.reply(MatchesHandler.getSafetyTipsText(), { parse_mode: 'Markdown' });
  });

  bot.callbackQuery('cmd_safety', async (ctx) => {
    await ctx.reply(SafetyHandler.getSafetyCharterText(), { parse_mode: 'Markdown' });
  });

  // Settings
  bot.callbackQuery('cmd_settings', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const profile = db.prepare('SELECT is_active FROM profiles WHERE user_id = ?').get(user.id) as any;
    const isDiscoverable = profile ? profile.is_active === 1 : true;

    await ctx.reply(
      `⚙ *PENGATURAN PRIVASI & AKUN SULA*\n\n` +
      `Status Discovery: *${isDiscoverable ? '🟢 Aktif (Dapat Ditemukan)' : '⏸ Nonaktif (Disembunyikan)'}*\n\n` +
      `Anda memegang kendali penuh atas visibilitas dan keberadaan data Anda di platform ini.`,
      {
        parse_mode: 'Markdown',
        reply_markup: SettingsHandler.getSettingsKeyboard(isDiscoverable),
      }
    );
  });

  // Account deletion
  bot.callbackQuery('delete_account_confirm', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    SettingsHandler.deleteUserAccount(user.id);

    await ctx.editMessageText(
      `🗑 *Akun dan Data Telah Dihapus*\n\n` +
      `Seluruh data profil, riwayat match, dan verifikasi Anda telah dihapus dari sistem SULA. ` +
      `Terima kasih telah menjadi bagian dari komunitas kami!`,
      { parse_mode: 'Markdown' }
    );
  });

  // Profile View
  bot.callbackQuery('cmd_my_profile', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const profile = db.prepare(`
      SELECT p.*, i.short_name as inst_short 
      FROM profiles p 
      JOIN institutions i ON i.id = p.institution_id 
      WHERE p.user_id = ?
    `).get(user.id) as any;

    if (!profile) {
      await ctx.reply('Profil Anda belum dibuat. Ketik /start untuk menyelesaikan pendaftaran.');
      return;
    }

    const previewText = ProfileHandler.renderProfilePreview(profile, profile.inst_short);
    const keyboard = ProfileHandler.getProfileKeyboard();

    if (profile.photo_file_id) {
      try {
        await ctx.replyWithPhoto(profile.photo_file_id, {
          caption: previewText,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
        return;
      } catch {
        // Fallback to text if photo delivery fails
      }
    }

    await ctx.reply(previewText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  // Prompt Profile Photo Upload
  bot.callbackQuery('upload_profile_photo', async (ctx) => {
    ctx.session.step = 'AWAITING_PROFILE_PHOTO';
    await ctx.reply(
      `📸 *Unggah Foto Profil Asli Anda*\n\n` +
      `SULA menerapkan moderasi keamanan foto ketat demi menjaga komunitas mahasiswa yang bersih dan berintegritas:\n\n` +
      `✅ *Ketentuan Foto:*\n` +
      `• Foto asli diri sendiri dengan wajah terlihat jelas.\n` +
      `• Berpakaian sopan dan pantas.\n\n` +
      `🚫 *Dilarang Keras:*\n` +
      `• Foto vulgar, sensual, nude, atau berunsur pornografi/NSFW (sistem otomatis menolak & memberi sanksi).\n` +
      `• Foto orang lain tanpa izin / gambar kartun / meme palsu.\n\n` +
      `_Silakan kirimkan foto profil Anda sekarang (sebagai Foto di Telegram):_`,
      { parse_mode: 'Markdown' }
    );
  });

  return bot;
}
