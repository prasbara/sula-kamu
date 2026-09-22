import { Bot, Context, InlineKeyboard, session, SessionFlavor } from 'grammy';
import { config } from '../config/index';
import { getDatabase } from '../database/db';
import { OnboardingHandler } from './handlers/onboarding';
import { ProfileHandler, SEMARANG_AREAS, AVAILABLE_INTERESTS } from './handlers/profile';
import { DiscoveryHandler } from './handlers/discovery';
import { MatchesHandler } from './handlers/matches';
import { SafetyHandler } from './handlers/safety';
import { SettingsHandler } from './handlers/settings';
import { VerificationService } from '../services/verification/verificationService';
import { MatchingService } from '../services/matchmaking/matchingService';
import { ModerationService } from '../services/safety/moderationService';
import { Institution, Profile, User } from '../types/index';
import { v4 as uuidv4 } from 'uuid';

import { PhotoModerationService } from '../services/safety/photoModerationService';
import { StatisticsService } from '../services/stats/statisticsService';
import { PhotoVerificationService } from '../services/verification/photoVerificationService';
import { SupportService } from '../services/support/supportService';
import { PaymentService } from '../services/payment/paymentService';
import { SafeChatService } from '../services/chat/safeChatService';
import { StrangerCamService } from '../services/stranger/strangerCamService';
import { TelegramService } from '../services/telegram/telegramService';
import { NotifyService } from '../services/notification/notifyService';

export interface SessionData {
  step:
    | 'IDLE'
    | 'AWAITING_AGE'
    | 'AWAITING_INSTITUTION'
    | 'AWAITING_KTM_UPLOAD'
    | 'AWAITING_PHOTO_VERIFICATION'
    | 'AWAITING_PROFILE_NAME'
    | 'AWAITING_PROFILE_MAJOR'
    | 'AWAITING_PROFILE_BIO'
    | 'AWAITING_PROFILE_PHOTO'
    | 'AWAITING_CHAT_MESSAGE'
    | 'AWAITING_TICKET_MESSAGE';
  selectedInstitutionId?: string;
  pendingName?: string;
  pendingMajor?: string;
  activeChatMatchId?: string;
  activeChatPartnerId?: string;
  activeReportTargetId?: string;
  activeTicketId?: string;
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

  // Set official bot command menu
  try {
    bot.api.setMyCommands([
      { command: 'start', description: 'Mulai atau hubungkan akun NIVA' },
      { command: 'menu', description: 'Buka menu utama NIVA' },
      { command: 'match', description: 'Mulai pencarian Stranger Cam 1-on-1' },
      { command: 'stop', description: 'Hentikan pencarian atau akhiri sesi obrolan' },
      { command: 'status', description: 'Lihat status antrean atau sesi aktif' },
      { command: 'premium', description: 'Informasi dan aktivasi NIVA Premium' },
      { command: 'ticket', description: 'Buka atau kelola tiket dukungan Premium' },
      { command: 'support', description: 'Bantuan admin resmi NIVA' },
      { command: 'profile', description: 'Lihat profil dan status verifikasi' },
      { command: 'report', description: 'Laporkan pengguna pada sesi aktif' },
      { command: 'block', description: 'Blokir pengguna pada sesi aktif' },
      { command: 'help', description: 'Panduan lengkap penggunaan NIVA' },
    ]).catch(() => {});
  } catch {}

  // ── Helper: Render Main Onboarding / Menu ─────────────────────────────────
  const getMainMenuKeyboard = () => {
    return new InlineKeyboard()
      .text('🎥 Cari Stranger', 'user_match_start')
      .text('💎 Premium', 'cmd_niva_premium')
      .row()
      .text('📖 Cara Menggunakan', 'cmd_how_to')
      .text('👤 Akun Saya', 'cmd_my_account')
      .row()
      .text('🎫 Tiket Saya', 'cmd_my_tickets')
      .text('🆘 Bantuan', 'cmd_support_help');
  };

  const renderMainMenuText = () => {
    return (
      `👋 *Selamat datang di NIVA.*\n\n` +
      `NIVA adalah platform Stranger Cam 1-on-1 untuk pengguna 18+ di komunitas Semarang.\n\n` +
      `*Fitur Utama:*\n` +
      `🎥 *Stranger Cam* — Obrolan video acak 1-on-1 langsung di browser\n` +
      `💎 *Premium* — Kuota prioritas, fitur eksklusif, & support VIP\n` +
      `🎫 *Premium Support* — Bantuan langsung dari tim admin NIVA\n` +
      `🔔 *Notification* — Update real-time untuk match dan tiket\n` +
      `🚫 *Report & Block* — Kontrol keamanan dan privasi ketat\n\n` +
      `Silakan pilih menu di bawah untuk memulai:`
    );
  };

  // ── /start command ────────────────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    const telegramId = ctx.from?.id.toString() || '';
    const rawMatch = (ctx.match || '').trim();
    const db = getDatabase();

    // 1. Account Linking Flow: /start link_<token> or /start <token>
    if (rawMatch) {
      const linkToken = rawMatch.startsWith('link_') ? rawMatch.slice(5) : rawMatch;
      const linkResult = TelegramService.verifyAndLinkToken(linkToken, telegramId);
      if (!linkResult.success) {
        await ctx.reply(
          `❌ *Gagal Menghubungkan Akun*\n\n${linkResult.message}\n\nSilakan generate token baru melalui menu profil di website NIVA.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      await ctx.reply(
        `🎉 *Akun NIVA Berhasil Terhubung!*\n\n` +
        `User ID: \`${linkResult.userId}\`\n` +
        `Telegram ID: \`${telegramId}\`\n\n` +
        `Akun Telegram Anda kini resmi tersinkronisasi dengan website NIVA. Notifikasi dan kontrol Stranger Cam Anda aktif.`,
        {
          parse_mode: 'Markdown',
          reply_markup: getMainMenuKeyboard(),
        }
      );
      return;
    }

    const user = OnboardingHandler.getOrCreateUser(telegramId);

    // Emergency switch check
    const regRow = db.prepare("SELECT value FROM system_settings WHERE key = 'registrations_enabled'").get() as { value: string } | undefined;
    if (regRow && regRow.value === 'false') {
      await ctx.reply('⚠️ Pendaftaran pengguna baru NIVA saat ini sedang ditutup sementara untuk peningkatan kapasitas sistem.');
      return;
    }

    if (user.status === 'BANNED') {
      await ctx.reply('⛔ Akun Anda telah ditangguhkan secara permanen karena pelanggaran terhadap Community Guidelines NIVA.');
      return;
    }

    await ctx.reply(renderMainMenuText(), {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(),
    });
  });

  // ── /menu command & callback ──────────────────────────────────────────────
  const handleMainMenu = async (ctx: any) => {
    await ctx.reply(renderMainMenuText(), {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(),
    });
  };
  bot.command('menu', handleMainMenu);
  bot.callbackQuery('cmd_main_menu', handleMainMenu);

  // ── /match command & callback ─────────────────────────────────────────────
  const handleMatchmaking = async (ctx: any) => {
    const telegramId = ctx.from?.id.toString() || '';
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    if (user.status === 'BANNED') {
      await ctx.reply('⛔ Akun Anda telah ditangguhkan.');
      return;
    }

    // Age gate validation
    if (!user.is_18_plus) {
      ctx.session.step = 'AWAITING_AGE';
      await ctx.reply(
        `⚠️ *Verifikasi Usia Diperlukan (18+ Only)*\n\n` +
        `NIVA Stranger Cam dikhususkan untuk pengguna dewasa berusia 18 tahun ke atas di komunitas Semarang.\n\n` +
        `Apakah Anda berusia 18 tahun atau lebih?`,
        {
          parse_mode: 'Markdown',
          reply_markup: OnboardingHandler.getAgeGateKeyboard(),
        }
      );
      return;
    }

    // Auto-confirm Semarang location if needed
    try {
      StrangerCamService.confirmSemarangLocation(user.id, 'USER_CONFIRMATION');
    } catch {}

    // Check active session
    const activeSession = StrangerCamService.getActiveSessionForUser(user.id);
    if (activeSession) {
      const appBaseUrl = (config.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
      const camUrl = `${appBaseUrl}/stranger-cam?session=${activeSession.id}&autojoin=true`;
      await ctx.reply(
        `🟢 *Sesi Stranger Cam Masih Berlangsung*\n\n` +
        `Session ID: \`${activeSession.id}\`\n` +
        `Status: 🟢 *CONNECTED*\n\n` +
        `Buka Stranger Cam di browser Anda untuk melanjutkan video:`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .url('🎥 MULAI VIDEO', camUrl)
            .row()
            .text('⏭ SKIP', `user_match:SKIP:${activeSession.id}`)
            .text('🚫 BLOCK', `user_match:BLOCK:${activeSession.id}`)
            .text('⚠️ REPORT', `user_match:REPORT:${activeSession.id}`)
            .row()
            .text('⏹ END', `user_match:END:${activeSession.id}`),
        }
      );
      return;
    }

    // Check if already in queue
    const inQueue = db.prepare('SELECT user_id FROM stranger_queue WHERE user_id = ?').get(user.id);
    if (inQueue) {
      await ctx.reply(
        `🔎 *Mencari stranger...*\n\n` +
        `Status: 🟡 *SEARCHING*\n\n` +
        `Anda sudah berada di dalam antrean matchmaking Semarang. Jangan tutup Telegram, kami akan segera mencocokkan Anda.`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⏹ Stop Searching', 'user_match:LEAVE_QUEUE')
            .text('📊 Status', 'cmd_match_status'),
        }
      );
      return;
    }

    // Join queue through shared matchmaking engine
    try {
      const result = StrangerCamService.joinQueue(user.id);
      if (result.status === 'CONNECTED' && result.session) {
        const appBaseUrl = (config.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
        const camUrl = `${appBaseUrl}/stranger-cam?session=${result.session.id}&autojoin=true`;
        await ctx.reply(
          `🎉 *Stranger ditemukan!*\n\n` +
          `Session:\n\`${result.session.id}\`\n\n` +
          `Buka Stranger Cam di browser Anda untuk memulai percakapan:`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .url('🎥 MULAI VIDEO', camUrl)
              .row()
              .text('⏭ SKIP', `user_match:SKIP:${result.session.id}`)
              .text('🚫 BLOCK', `user_match:BLOCK:${result.session.id}`)
              .text('⚠️ REPORT', `user_match:REPORT:${result.session.id}`)
              .row()
              .text('⏹ END', `user_match:END:${result.session.id}`),
          }
        );
      } else {
        await ctx.reply(
          `🔎 *Mencari stranger...*\n\n` +
          `Status:\n🟡 *SEARCHING*\n\n` +
          `_Jangan tutup NIVA jika ingin melanjutkan ke video conversation._`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('⏹ Stop Searching', 'user_match:LEAVE_QUEUE')
              .text('📊 Status', 'cmd_match_status'),
          }
        );
      }
    } catch (err: any) {
      await ctx.reply(`❌ Kendala matchmaking: ${err.message || 'Gagal masuk antrean.'}`);
    }
  };

  bot.command('match', handleMatchmaking);
  bot.callbackQuery('user_match_start', handleMatchmaking);

  // ── /stop command ─────────────────────────────────────────────────────────
  const handleStopMatch = async (ctx: any) => {
    const telegramId = ctx.from?.id.toString() || '';
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const activeSession = StrangerCamService.getActiveSessionForUser(user.id);
    if (activeSession) {
      StrangerCamService.endSession(activeSession.id, user.id, 'USER_ENDED');
      await ctx.reply('⏹ *Sesi Stranger Cam telah diakhiri.*\n\nKoneksi WebRTC dibersihkan. Partner telah dinotifikasi.');
      return;
    }

    const inQueue = db.prepare('SELECT user_id FROM stranger_queue WHERE user_id = ?').get(user.id);
    if (inQueue) {
      StrangerCamService.leaveQueue(user.id);
      await ctx.reply('⏹ *Pencarian dihentikan.* Anda telah keluar dari antrean.');
      return;
    }

    await ctx.reply('⚪ Anda tidak sedang dalam antrean atau sesi aktif. Ketik /match untuk mencari stranger.');
  };
  bot.command('stop', handleStopMatch);

  // ── /status command & callback ────────────────────────────────────────────
  const handleStatusMatch = async (ctx: any) => {
    const telegramId = ctx.from?.id.toString() || '';
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const activeSession = StrangerCamService.getActiveSessionForUser(user.id);
    if (activeSession) {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 1000));
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      const appBaseUrl = (config.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
      const camUrl = `${appBaseUrl}/stranger-cam?session=${activeSession.id}&autojoin=true`;

      await ctx.reply(
        `Status:\n🟢 *CONNECTED*\n\n` +
        `Session: \`${activeSession.id}\`\n` +
        `Partner: *Anonymous*\n` +
        `Duration: *${mins}:${secs}*`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .url('🎥 Open Stranger Cam', camUrl)
            .row()
            .text('⏭ SKIP', `user_match:SKIP:${activeSession.id}`)
            .text('⏹ STOP', `user_match:END:${activeSession.id}`),
        }
      );
      return;
    }

    const inQueue = db.prepare('SELECT entered_at FROM stranger_queue WHERE user_id = ?').get(user.id) as { entered_at: string } | undefined;
    if (inQueue) {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(inQueue.entered_at).getTime()) / 1000));
      await ctx.reply(
        `Status:\n🟡 *SEARCHING*\n\n` +
        `Menunggu pasangan stranger Semarang online (${elapsed} detik).`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⏹ Stop Searching', 'user_match:LEAVE_QUEUE'),
        }
      );
      return;
    }

    await ctx.reply(
      `Status:\n⚪ *IDLE*\n\n` +
      `Anda tidak sedang dalam antrean atau sesi obrolan aktif.`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🎥 Cari Stranger', 'user_match_start'),
      }
    );
  };
  bot.command('status', handleStatusMatch);
  bot.callbackQuery('cmd_match_status', handleStatusMatch);

  // ── /premium command & callback ───────────────────────────────────────────
  const handlePremiumFlow = async (ctx: any) => {
    const telegramId = ctx.from?.id.toString() || '';
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    if (user.status === 'BANNED') {
      await ctx.reply('⛔ Akun Anda telah ditangguhkan.');
      return;
    }

    const activeSub = db.prepare(`
      SELECT s.*, sp.name as plan_name 
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = ? AND s.status = 'ACTIVE' AND s.ends_at > datetime('now')
      ORDER BY s.ends_at DESC LIMIT 1
    `).get(user.id) as { ends_at: string; plan_name: string } | undefined;

    const plans = PaymentService.getPlans();
    let pricingText = '';
    const keyboard = new InlineKeyboard();

    for (const plan of plans) {
      const priceFormatted = `Rp${plan.price.toLocaleString('id-ID')}`;
      const months = Math.round(plan.duration_days / 30) || 1;
      pricingText += `• *${plan.name}* ${priceFormatted} / ${months} bulan\n`;
      keyboard.text(`💎 Beli ${plan.name} (${priceFormatted})`, `buy_plan:${plan.id}`).row();
    }

    const { ticket } = SupportService.getOrCreatePremiumTicket(user.id);
    const queuePos = SupportService.getQueuePosition(ticket.id);

    keyboard.text('🎫 Chat Admin / Tiket Support', 'cmd_open_ticket').row();
    const appBaseUrl = (config.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    keyboard.url('🌐 Buka Web NIVA', `${appBaseUrl}/premium`);

    let statusHeader = '';
    if (activeSub) {
      const expiryFormatted = new Date(activeSub.ends_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      statusHeader =
        `⭐ *Status Premium Anda: AKTIF*\n` +
        `Paket: *${activeSub.plan_name}*\n` +
        `Berlaku sampai: *${expiryFormatted}*\n` +
        `Kuota Like: *50 like / hari*\n\n` +
        `────────────────────\n\n`;
    }

    const messageText =
      `${statusHeader}🌟 *NIVA Premium Membership*\n\n` +
      `${pricingText}\n` +
      `Admin akan membantu sesuai antrean (Posisi Antrean: #${queuePos || 1}).\n\n` +
      `🎫 *Nomor Tiket Dukungan:* \`${ticket.id}\`\n\n` +
      `_Pilih paket berlangganan atau hubungi admin support di bawah:_`;

    await ctx.reply(messageText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  };
  bot.command('premium', handlePremiumFlow);
  bot.callbackQuery('cmd_niva_premium', handlePremiumFlow);

  // ── /ticket & /support commands ───────────────────────────────────────────
  const handleSupportCommand = async (ctx: any) => {
    const telegramId = ctx.from?.id.toString() || '';
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const { ticket } = SupportService.getOrCreatePremiumTicket(user.id);
    db.prepare('UPDATE support_tickets SET telegram_chat_id = ? WHERE id = ?').run(telegramId, ticket.id);

    const queuePos = SupportService.getQueuePosition(ticket.id);
    ctx.session.step = 'AWAITING_TICKET_MESSAGE';
    ctx.session.activeTicketId = ticket.id;

    await ctx.reply(
      `🎫 *Premium Support*\n\n` +
      `Silakan jelaskan kebutuhan Anda.\n` +
      `Pesan berikutnya akan dibuat menjadi ticket.\n\n` +
      `Ticket ID:\n\`${ticket.id}\`\n\n` +
      `Status: *${ticket.status}*\n` +
      `Posisi Antrean: *#${queuePos || 1}*\n\n` +
      `_Ketik pesan Anda langsung di obrolan ini:_`,
      { parse_mode: 'Markdown' }
    );
  };
  bot.command('ticket', handleSupportCommand);
  bot.command('support', handleSupportCommand);
  bot.callbackQuery('cmd_open_ticket', handleSupportCommand);
  bot.callbackQuery('cmd_support_help', handleSupportCommand);

  // ── /profile command & callback ───────────────────────────────────────────
  const handleProfileCommand = async (ctx: any) => {
    const telegramId = ctx.from?.id.toString() || '';
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const profile = db.prepare(`
      SELECT p.*, i.short_name as inst_short 
      FROM profiles p 
      LEFT JOIN institutions i ON i.id = p.institution_id 
      WHERE p.user_id = ?
    `).get(user.id) as any;

    const sub = db.prepare(`
      SELECT s.*, sp.name as plan_name 
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = ? AND s.status = 'ACTIVE' AND s.ends_at > datetime('now')
      ORDER BY s.ends_at DESC LIMIT 1
    `).get(user.id) as any;

    const displayName = profile?.display_name || ctx.from?.first_name || 'Pengguna NIVA';
    const subStatus = sub ? `⭐ PREMIUM_ACTIVE (${sub.plan_name})` : '⚪ FREE';
    const verifStatus = user.verification_status || 'UNVERIFIED';

    await ctx.reply(
      `👤 *PROFIL PENGGUNA NIVA*\n\n` +
      `Nama: *${displayName}*\n` +
      `User ID: \`${user.id}\`\n` +
      `Telegram ID: \`${telegramId}\`\n` +
      `Status Akun: *${user.status}*\n` +
      `Verifikasi: *${verifStatus}*\n` +
      `Langganan: *${subStatus}*\n` +
      (sub ? `Aktif Sampai: *${new Date(sub.ends_at).toLocaleDateString('id-ID')}*\n` : '') +
      `Age Gate: *${user.is_18_plus ? '✅ 18+ (Terkonfirmasi)' : '⚠️ Belum Konfirmasi'}*\n\n` +
      `_Akun terhubung resmi dengan sistem NIVA._`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🎥 Cari Stranger', 'user_match_start')
          .text('💎 Beli Premium', 'cmd_niva_premium')
          .row()
          .text('🎫 Tiket Bantuan', 'cmd_open_ticket')
          .text('🏠 Menu Utama', 'cmd_main_menu'),
      }
    );
  };
  bot.command('profile', handleProfileCommand);
  bot.callbackQuery('cmd_my_account', handleProfileCommand);

  // ── /report command ───────────────────────────────────────────────────────
  bot.command('report', async (ctx) => {
    const telegramId = ctx.from?.id.toString() || '';
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    const activeSession = StrangerCamService.getActiveSessionForUser(user.id);
    if (!activeSession) {
      await ctx.reply(
        `⚠️ Anda sedang tidak memiliki sesi Stranger Cam aktif untuk dilaporkan.\n\n` +
        `Jika ingin melaporkan akun atau kendala lain, silakan gunakan perintah /ticket.`
      );
      return;
    }

    await ctx.reply(
      `🚨 *Laporkan Pengguna Sesi Ini*\n\n` +
      `Session ID: \`${activeSession.id}\`\n\n` +
      `Pilih kategori pelanggaran di bawah. Sesi obrolan akan otomatis dihentikan demi keselamatan Anda:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🔞 Konten Vulgar / Nudity', `user_report:NUDITY:${activeSession.id}`)
          .row()
          .text('🤬 Pelecehan / Harassment', `user_report:HARASSMENT:${activeSession.id}`)
          .row()
          .text('💰 Penipuan / Scam', `user_report:SCAM:${activeSession.id}`)
          .row()
          .text('👶 Indikasi Bawah Umur', `user_report:UNDERAGE_CONCERN:${activeSession.id}`)
          .row()
          .text('⚠️ Perilaku Tidak Pantas', `user_report:INAPPROPRIATE_BEHAVIOR:${activeSession.id}`),
      }
    );
  });

  // ── /block command ────────────────────────────────────────────────────────
  bot.command('block', async (ctx) => {
    const telegramId = ctx.from?.id.toString() || '';
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    const activeSession = StrangerCamService.getActiveSessionForUser(user.id);
    if (!activeSession) {
      await ctx.reply('⚠️ Anda tidak sedang dalam sesi obrolan aktif.');
      return;
    }

    const partnerId = activeSession.user_a_id === user.id ? activeSession.user_b_id : activeSession.user_a_id;
    ModerationService.blockUser(user.id, partnerId, 'Blocked via Telegram /block command');
    StrangerCamService.endSession(activeSession.id, user.id, 'BLOCKED');

    await ctx.reply('🚫 *Pengguna telah diblokir.* Sesi obrolan dihentikan.');
  });

  // ── /help command & callback ──────────────────────────────────────────────
  const handleHelpCommand = async (ctx: any) => {
    await ctx.reply(
      `📖 *PANDUAN PENGGUNAAN NIVA*\n\n` +
      `*1. Stranger Cam 1-on-1*\n` +
      `Ketik /match untuk mencari video conversation dengan pengguna Semarang lain secara instan. ` +
      `Gunakan /status untuk memantau durasi, atau /stop untuk mengakhiri.\n\n` +
      `*2. Privasi & Keamanan*\n` +
      `Lokasi GPS presisi dan identitas asli tidak pernah dibagikan ke partner. ` +
      `Gunakan tombol Block atau Report seketika jika terjadi pelanggaran etika.\n\n` +
      `*3. NIVA Premium*\n` +
      `Ketik /premium untuk membuka fitur eksklusif, batas like lebih tinggi, dan prioritas antrean.\n\n` +
      `*4. Dukungan Admin*\n` +
      `Ketik /ticket untuk mengirimkan pesan ke tim admin NIVA.\n\n` +
      `*Daftar Perintah Resmi:*\n` +
      `/menu - Menu utama NIVA\n` +
      `/match - Mulai cari stranger\n` +
      `/status - Status obrolan saat ini\n` +
      `/stop - Hentikan sesi obrolan\n` +
      `/premium - Informasi paket premium\n` +
      `/ticket - Buka tiket bantuan\n` +
      `/profile - Informasi akun\n` +
      `/report - Laporkan pelanggaran\n` +
      `/block - Blokir pengguna\n` +
      `/help - Panduan penggunaan`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🎥 Cari Stranger', 'user_match_start')
          .text('🏠 Menu Utama', 'cmd_main_menu'),
      }
    );
  };
  bot.command('help', handleHelpCommand);
  bot.callbackQuery('cmd_how_to', handleHelpCommand);

  // ── Matchmaking Callbacks ─────────────────────────────────────────────────
  bot.callbackQuery(/user_match:SKIP:(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const session = db.prepare('SELECT * FROM stranger_sessions WHERE id = ?').get(sessionId) as any;
    if (!session || (session.user_a_id !== user.id && session.user_b_id !== user.id)) {
      await ctx.reply('⚠️ Sesi tidak valid atau telah berakhir.');
      return;
    }

    StrangerCamService.endSession(sessionId, user.id, 'SKIPPED');
    await ctx.reply('⏭ *Sesi dilewati.* Mencari stranger baru...');

    try {
      const nextMatch = StrangerCamService.joinQueue(user.id);
      if (nextMatch.status === 'CONNECTED' && nextMatch.session) {
        const appBaseUrl = (config.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
        const camUrl = `${appBaseUrl}/stranger-cam?session=${nextMatch.session.id}&autojoin=true`;
        await ctx.reply(
          `🎉 *Stranger ditemukan!*\n\n` +
          `Session:\n\`${nextMatch.session.id}\`\n\n` +
          `Buka Stranger Cam di browser:`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .url('🎥 MULAI VIDEO', camUrl)
              .row()
              .text('⏭ SKIP', `user_match:SKIP:${nextMatch.session.id}`)
              .text('🚫 BLOCK', `user_match:BLOCK:${nextMatch.session.id}`)
              .text('⚠️ REPORT', `user_match:REPORT:${nextMatch.session.id}`)
              .row()
              .text('⏹ END', `user_match:END:${nextMatch.session.id}`),
          }
        );
      } else {
        await ctx.reply(
          `🔎 *Mencari stranger...*\n\n` +
          `Status:\n🟡 *SEARCHING*\n\n` +
          `_Jangan tutup NIVA jika ingin melanjutkan ke video conversation._`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('⏹ Stop Searching', 'user_match:LEAVE_QUEUE')
              .text('📊 Status', 'cmd_match_status'),
          }
        );
      }
    } catch (err: any) {
      await ctx.reply(`❌ Kendala: ${err.message}`);
    }
  });

  bot.callbackQuery(/user_match:BLOCK:(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const session = db.prepare('SELECT * FROM stranger_sessions WHERE id = ?').get(sessionId) as any;
    if (!session || (session.user_a_id !== user.id && session.user_b_id !== user.id)) {
      await ctx.reply('⚠️ Sesi tidak valid atau telah berakhir.');
      return;
    }

    const partnerId = session.user_a_id === user.id ? session.user_b_id : session.user_a_id;
    ModerationService.blockUser(user.id, partnerId, 'Blocked via Telegram Stranger Cam');
    StrangerCamService.endSession(sessionId, user.id, 'BLOCKED');
    await ctx.reply('🚫 *Pengguna telah diblokir.* Anda tidak akan dipasangkan lagi dengan pengguna ini.');
  });

  bot.callbackQuery(/user_match:REPORT:(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    await ctx.reply(
      `🚨 *Pilih Alasan Laporan:*\n\nSesi akan otomatis dihentikan demi kenyamanan Anda:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🔞 Nudity / Vulgar', `user_report:NUDITY:${sessionId}`)
          .row()
          .text('🤬 Harassment / Pelecehan', `user_report:HARASSMENT:${sessionId}`)
          .row()
          .text('💰 Scam / Penipuan', `user_report:SCAM:${sessionId}`)
          .row()
          .text('👶 Underage Concern', `user_report:UNDERAGE_CONCERN:${sessionId}`)
          .row()
          .text('⚠️ Inappropriate', `user_report:INAPPROPRIATE_BEHAVIOR:${sessionId}`),
      }
    );
  });

  bot.callbackQuery(/user_report:(.+):(.+)/, async (ctx) => {
    const reason = ctx.match[1] as any;
    const sessionId = ctx.match[2];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const session = db.prepare('SELECT * FROM stranger_sessions WHERE id = ?').get(sessionId) as any;
    if (!session) {
      await ctx.reply('⚠️ Sesi obrolan tidak ditemukan.');
      return;
    }

    const partnerId = session.user_a_id === user.id ? session.user_b_id : session.user_a_id;
    try {
      StrangerCamService.reportStranger(sessionId, user.id, partnerId, reason, 'Reported via Telegram');
      await ctx.reply('⚠️ *Laporan diterima.* Pengguna telah diblokir dan sesi dihentikan.');
    } catch (err: any) {
      await ctx.reply(`❌ Gagal melaporkan: ${err.message}`);
    }
  });

  bot.callbackQuery(/user_match:END:(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    StrangerCamService.endSession(sessionId, user.id, 'USER_ENDED');
    await ctx.reply('⏹ *Sesi Stranger Cam telah diakhiri.*');
  });

  bot.callbackQuery('user_match:LEAVE_QUEUE', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    StrangerCamService.leaveQueue(user.id);
    await ctx.reply('⏹ *Pencarian dihentikan.* Anda telah keluar dari antrean.');
  });

  // ── Plan Purchase Callback ────────────────────────────────────────────────
  bot.callbackQuery(/buy_plan:(.+)/, async (ctx) => {
    const planId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    try {
      const payment = PaymentService.createPaymentRequest(user.id, planId, 'QRIS');
      const plans = PaymentService.getPlans();
      const plan = plans.find((p) => p.id === planId) || { name: 'Premium Plan', price: 5000 };
      const priceFormatted = `Rp${plan.price.toLocaleString('id-ID')}`;

      const appBaseUrl = (config.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
      const checkoutUrl = `${appBaseUrl}/premium/checkout?payment_id=${payment.id}`;

      await ctx.reply(
        `💳 *Tagihan Pembayaran NIVA Premium Dibuat*\n\n` +
        `Nomor Tagihan: \`${payment.id}\`\n` +
        `Paket: *${plan.name}*\n` +
        `Total: *${priceFormatted}*\n` +
        `Metode: *QRIS (Transfer Bank / E-Wallet)*\n` +
        `Status: ⏳ *PENDING_PAYMENT*\n\n` +
        `*Instruksi:* Buka formulir pembayaran di browser untuk memindai QRIS resmi dan unggah bukti transfer. Status otomatis menjadi PREMIUM_ACTIVE setelah diverifikasi admin.`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .url('💳 Buka Pembayaran di Web', checkoutUrl)
            .row()
            .text('🎫 Chat Admin Support', 'cmd_open_ticket'),
        }
      );
    } catch (err: any) {
      await ctx.reply(`❌ Gagal membuat tagihan pembayaran: ${err.message}`);
    }
  });

  // ── User Ticket List Callback ─────────────────────────────────────────────
  bot.callbackQuery('cmd_my_tickets', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const tickets = db.prepare(`
      SELECT id, type, subject, status, created_at 
      FROM support_tickets 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 5
    `).all(user.id) as any[];

    if (!tickets || tickets.length === 0) {
      await ctx.reply(
        `🎫 *Tiket Bantuan Anda*\n\n` +
        `Anda belum memiliki riwayat tiket bantuan. Ketik /ticket jika membutuhkan bantuan.`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('🎫 Buka Tiket Baru', 'cmd_open_ticket'),
        }
      );
      return;
    }

    let ticketListText = `🎫 *Daftar Tiket Bantuan Anda:*\n\n`;
    for (const t of tickets) {
      const dateStr = new Date(t.created_at).toLocaleDateString('id-ID');
      ticketListText += `• \`${t.id}\` — *${t.status}* [${dateStr}]\n`;
    }
    ticketListText += `\n_Ketik /ticket untuk mengirimkan pesan ke admin._`;

    await ctx.reply(ticketListText, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('💬 Balas / Buka Tiket', 'cmd_open_ticket')
        .text('🏠 Menu Utama', 'cmd_main_menu'),
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

    await ctx.editMessageText(
      `🎓 *Kampus Terpilih:* ${inst.name} (${inst.short_name})\n\n` +
      `🛡️ *Langkah 2: Pilih Opsi Verifikasi Akun NIVA*\n\n` +
      `NIVA mendukung 2 jalur verifikasi manual demi menjaga keamanan komunitas:\n\n` +
      `1️⃣ *Verifikasi Mahasiswa (KTM)*\n` +
      `• Unggah kartu mahasiswa aktif Anda\n` +
      `• Status: *Student Verified 🛡️*\n` +
      `• Kuota Like: *50 like / hari*\n\n` +
      `2️⃣ *Verifikasi Foto Asli (Selfie)*\n` +
      `• Unggah foto selfie asli diri Anda\n` +
      `• Status: *Photo Verified 👤* (Bukan bukti keaktifan kampus)\n` +
      `• Kuota Like: *50 like / hari*\n\n` +
      `3️⃣ *Lewati Verifikasi (Akun Gratis)*\n` +
      `• Mulai langsung tanpa dokumen\n` +
      `• Status: *Unverified*\n` +
      `• Kuota Like: *10 like / hari*\n\n` +
      `_Silakan tentukan pilihan Anda:_`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🎓 Verifikasi Mahasiswa (KTM)', 'choose_verif_ktm')
          .row()
          .text('👤 Verifikasi Foto Asli (Selfie)', 'choose_verif_photo')
          .row()
          .text('⚡ Lewati (Akun Gratis - 10 Like/Hari)', 'choose_verif_skip'),
      }
    );
  });

  // Verification Choice: KTM
  bot.callbackQuery('choose_verif_ktm', async (ctx) => {
    ctx.session.step = 'AWAITING_KTM_UPLOAD';
    await ctx.editMessageText(
      `📸 *Verifikasi Mahasiswa (KTM)*\n\n` +
      `Silakan kirimkan foto Kartu Tanda Mahasiswa (KTM) Anda.\n\n` +
      `🔒 *Jaminan Keamanan & Privasi SULA/NIVA:*\n` +
      `• Metadata EXIF & GPS langsung dihapus.\n` +
      `• Foto diproses secara terenkripsi hanya untuk validasi mahasiswa.\n` +
      `• *NIM dan foto KTM TIDAK PERNAH disimpan permanen* atau diperlihatkan ke publik.\n\n` +
      `_Silakan kirimkan foto KTM Anda sekarang (sebagai Foto di Telegram):_`,
      { parse_mode: 'Markdown' }
    );
  });

  // Verification Choice: Photo
  bot.callbackQuery('choose_verif_photo', async (ctx) => {
    ctx.session.step = 'AWAITING_PHOTO_VERIFICATION';
    await ctx.editMessageText(
      `📸 *Verifikasi Foto Asli (Selfie)*\n\n` +
      `Silakan kirimkan foto selfie asli Anda saat ini yang jelas dan berpakaian sopan.\n\n` +
      `⚠️ *Catatan Transparansi:*\n` +
      `Verifikasi foto membuktikan keaslian profil foto Anda (*Photo Verified 👤*) dan memberikan kuota *50 like/hari*, namun *BUKAN* merupakan bukti status mahasiswa terdaftar di universitas.\n\n` +
      `_Silakan kirimkan foto selfie Anda sekarang (sebagai Foto di Telegram):_`,
      { parse_mode: 'Markdown' }
    );
  });

  // Verification Choice: Skip
  bot.callbackQuery('choose_verif_skip', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const existingProfile = db.prepare('SELECT id FROM profiles WHERE user_id = ?').get(user.id);
    if (existingProfile) {
      ctx.session.step = 'IDLE';
      await ctx.editMessageText(
        `⚡ *Verifikasi Dilewati*\n\n` +
        `Akun Anda berstatus *Unverified* dengan kuota harian *10 like/hari*. Anda dapat mengajukan verifikasi kapan saja lewat menu Profil.`,
        {
          parse_mode: 'Markdown',
          reply_markup: ProfileHandler.getProfileKeyboard(),
        }
      );
    } else {
      ctx.session.step = 'AWAITING_PROFILE_MAJOR';
      await ctx.editMessageText(
        `⚡ *Verifikasi Dilewati (Akun Gratis - 10 Like/Hari)*\n\n` +
        `Langkah selanjutnya: Lengkapi profil Anda.\n` +
        `Ketik *Jurusan / Program Studi* Anda (misal: Teknik Informatika, Manajemen, dll):`,
        { parse_mode: 'Markdown' }
      );
    }
  });

  // Verification Menu from Profile/Settings
  bot.callbackQuery('cmd_verify_menu', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    const u = db.prepare('SELECT verification_status FROM users WHERE id = ?').get(user.id) as any;
    const curStatus = u?.verification_status || 'UNVERIFIED';

    await ctx.reply(
      `🛡️ *PUSAT VERIFIKASI AKUN NIVA*\n\n` +
      `Status Verifikasi Saat Ini: *${curStatus}*\n\n` +
      `Pilih jalur verifikasi untuk meningkatkan kuota harian menjadi *50 like/hari*:\n\n` +
      `• *Student Verified (KTM)*: Bukti sah mahasiswa kampus Semarang.\n` +
      `• *Photo Verified (Selfie)*: Bukti keaslian foto profil.\n`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🎓 Verifikasi Mahasiswa (KTM)', 'choose_verif_ktm')
          .row()
          .text('👤 Verifikasi Foto Asli (Selfie)', 'choose_verif_photo')
          .row()
          .text('🔙 Kembali ke Profil', 'cmd_my_profile'),
      }
    );
  });

  bot.callbackQuery('cmd_premium', handlePremiumFlow);

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

    // 2. Photo Verification Handler (Option B - Real Photo Verification / Level 1)
    if (ctx.session.step === 'AWAITING_PHOTO_VERIFICATION') {
      const statusMsg = await ctx.reply('⏳ Memeriksa foto selfie Anda dengan sistem keamanan terenkripsi...');
      try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.api.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await PhotoVerificationService.submitPhotoVerification(user.id, buffer);

        if (result.success) {
          const existingProfile = db.prepare('SELECT id FROM profiles WHERE user_id = ?').get(user.id);
          if (existingProfile) {
            ctx.session.step = 'IDLE';
            await ctx.api.editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              `✅ *Foto Verifikasi Berhasil Diterima!*\n\n` +
              `Status: *PHOTO_PENDING*\n` +
              `Foto selfie Anda telah masuk antrean peninjauan admin (FIFO).\n` +
              `Setelah disetujui, akun Anda berstatus *Photo Verified 👤* dengan kuota *50 like/hari*.\n\n` +
              `_Catatan: Verifikasi foto membuktikan keaslian profil foto dan bukan bukti status mahasiswa resmi._`,
              {
                parse_mode: 'Markdown',
                reply_markup: ProfileHandler.getProfileKeyboard(),
              }
            );
          } else {
            ctx.session.step = 'AWAITING_PROFILE_MAJOR';
            await ctx.api.editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              `✅ *Foto Verifikasi Berhasil Diterima!*\n\n` +
              `Status: *PHOTO_PENDING* (Menunggu tinjauan admin FIFO).\n\n` +
              `Langkah selanjutnya: Buat profil Anda.\n` +
              `Ketik *Jurusan / Program Studi* Anda (misal: Teknik Informatika, Manajemen, Hukum, dll):`,
              { parse_mode: 'Markdown' }
            );
          }
        } else {
          await ctx.api.editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            `❌ *Verifikasi Foto Belum Berhasil*\n\n${result.message}\n\n` +
            `Silakan kirimkan foto selfie asli yang jelas dan berpakaian sopan.`,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (err: any) {
        console.error('Error during photo verification submission:', err);
        await ctx.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          'Terjadi kendala saat memproses foto verifikasi. Silakan coba kirim ulang.'
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

    // ── Premium Support Ticket Messaging ────────────────────────────────────
    if (ctx.session.step === 'AWAITING_TICKET_MESSAGE') {
      const ticketId = ctx.session.activeTicketId || SupportService.getOrCreatePremiumTicket(user.id).ticket.id;
      const senderName = ctx.from.first_name || 'Telegram User';

      try {
        SupportService.sendMessage(ticketId, 'USER', user.id, senderName, text);
        db.prepare('UPDATE support_tickets SET telegram_chat_id = ? WHERE id = ?').run(telegramId, ticketId);
        ctx.session.step = 'IDLE';

        await ctx.reply(
          `✅ *Pesan Anda Telah Diterima!*\n\n` +
          `Nomor Tiket: \`${ticketId}\`\n` +
          `Pesan: "${text}"\n\n` +
          `Tim admin NIVA telah menerima pesan Anda dan akan segera membalasnya. ` +
          `Anda dapat terus mengirimkan pesan tambahan ke tiket ini melalui /ticket kapan saja.`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('🎫 Cek Tiket Saya', 'cmd_my_tickets')
              .text('🏠 Menu Utama', 'cmd_main_menu'),
          }
        );
      } catch (err: any) {
        await ctx.reply(`❌ Gagal mengirim pesan ke tiket: ${err.message}`);
        ctx.session.step = 'IDLE';
      }
      return;
    }

    // ── Safe Chat Sandbox: Mediated Messaging ────────────────────────────────
    if (ctx.session.step === 'AWAITING_CHAT_MESSAGE' && ctx.session.activeChatMatchId) {
      const matchId = ctx.session.activeChatMatchId;
      const partnerId = ctx.session.activeChatPartnerId;

      if (!partnerId) {
        await ctx.reply('❌ Sesi chat tidak valid. Buka chat dari daftar Matches Anda.');
        ctx.session.step = 'IDLE';
        return;
      }

      try {
        const result = SafeChatService.sendSandboxMessage(matchId, user.id, partnerId, text);

        if (!result.success) {
          await ctx.reply(result.moderation.userMessage || '⚠️ Pesan Anda tidak dapat dikirimkan karena melanggar Community Guidelines NIVA.');

          if (result.sessionStatus === 'REPORTED') {
            await ctx.reply(
              '🚫 *Sesi Obrolan Dihentikan*\n\n' +
              'Percakapan ini telah dihentikan secara otomatis karena terlalu banyak pelanggaran Community Guidelines.',
              { parse_mode: 'Markdown' }
            );
            ctx.session.step = 'IDLE';
          }
          return;
        }

        // Relay to partner
        const partnerUser = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(partnerId) as { telegram_id: string } | undefined;
        const partnerProfile = MatchingService.getProfileByUserId(partnerId);
        const myProfile = db.prepare('SELECT display_name FROM profiles WHERE user_id = ?').get(user.id) as { display_name: string } | undefined;

        if (partnerUser && partnerProfile) {
          try {
            await ctx.api.sendMessage(
              parseInt(partnerUser.telegram_id),
              `💬 *Pesan dari ${myProfile?.display_name ?? 'Teman NIVA'}*\n\n${text}\n\n` +
              `_Balas melalui: Matches → Chat → Balas Pesan_`,
              { parse_mode: 'Markdown' }
            );
          } catch { /* silent */ }
        }

        let confirmText = '✅ Pesan terkirim!';
        if (result.moderation.action === 'WARNED') {
          confirmText += '\n' + (result.moderation.userMessage ?? '');
        }

        if (result.sessionStatus === 'SAFE_CHAT_COMPLETED') {
          confirmText += '\n\n🎉 *10 menit sesi aktif selesai!* Pilih untuk melanjutkan secara pribadi atau akhiri.';
        } else if (['SAFE_CHAT_ACTIVE', 'SAFE_CHAT_PAUSED'].includes(result.sessionStatus)) {
          const mins = Math.ceil(result.remainingSeconds / 60);
          confirmText += `\n⏱ Sesi aktif: ${mins} mnt lagi.`;
        }

        await ctx.reply(confirmText, {
          parse_mode: 'Markdown',
          reply_markup: MatchesHandler.getChatSafetyKeyboard(
            matchId,
            partnerId,
            result.sessionStatus,
            result.remainingSeconds
          ),
        });
        ctx.session.step = 'IDLE';
      } catch (err: any) {
        await ctx.reply(`❌ Gagal mengirim pesan: ${err.message}`);
        ctx.session.step = 'IDLE';
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

      // Record Onboarding Completion for real cumulative growth counter (Section 2 & 3)
      StatisticsService.recordOnboardingCompletion(user.id);

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

    try {
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
      await DiscoveryHandler.sendCard(ctx, candidate, remaining.remaining);
    } catch (err: any) {
      if (err.message?.includes('EXCLUSIVE_CHAT_ACTIVE')) {
        await ctx.reply(
          `🔒 *Sesi Obrolan Sedang Berlangsung*\n\n` +
          `Kamu sedang ngobrol dengan satu match.\n` +
          `Selesaikan sesi ini terlebih dahulu sebelum mencari match lain.`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('💬 Buka Chat Match Saya', 'cmd_matches'),
          }
        );
      } else {
        await ctx.reply(`⚠️ ${err.message}`);
      }
    }
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
      await DiscoveryHandler.sendCard(ctx, queue[0], remaining.remaining);
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

  // ── Open Chat Room (Exclusive Session-aware) ───────────────────────────────
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

    // Join session (acquires lock only when BOTH have joined)
    const { session, lockAcquired } = SafeChatService.joinSession(matchId, user.id);
    const sessionStatus = SafeChatService.getSessionStatus(matchId);

    // Fetch message history
    const messages = SafeChatService.getChatHistory(matchId, 10);

    let chatText =
      `💬 *Ruang Obrolan NIVA*\n` +
      `Dengan: *${partnerProfile?.displayName ?? 'Teman NIVA'}* (${partnerProfile?.institutionShortName ?? 'Kampus'})\n\n`;

    chatText += SafeChatService.getStatusBanner(sessionStatus.status, sessionStatus.activeSeconds) + '\n\n';
    chatText += '─'.repeat(30) + '\n\n';

    if (messages.length === 0) {
      chatText += `_Belum ada pesan. Mulailah menyapa teman baru Anda!_\n\n`;
    } else {
      for (const m of messages) {
        const isMe = m.sender_id === user.id;
        const senderLabel = isMe ? '👤 Anda' : `💬 ${m.sender_name ?? partnerProfile?.displayName ?? 'Teman'}`;
        const time = new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        chatText += `${senderLabel} [${time}]: ${m.content}\n`;
      }
      chatText += '\n';
    }

    chatText += `🔒 _Obrolan dimediasi platform NIVA — identitas Telegram Anda terlindungi._`;

    await ctx.reply(chatText, {
      parse_mode: 'Markdown',
      reply_markup: MatchesHandler.getChatSafetyKeyboard(matchId, partnerId, sessionStatus.status, sessionStatus.remainingSeconds),
    });
  });

  // ── Reply Message Prompt ─────────────────────────────────────────────────────
  bot.callbackQuery(/reply_msg_(.+)/, async (ctx) => {
    const matchId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    // Determine partner
    const match = db.prepare('SELECT * FROM matches WHERE id = ? AND is_active = 1').get(matchId) as any;
    if (!match) {
      await ctx.reply('❌ Match tidak ditemukan atau tidak aktif.');
      return;
    }

    const partnerId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;
    ctx.session.activeChatMatchId = matchId;
    ctx.session.activeChatPartnerId = partnerId;
    ctx.session.step = 'AWAITING_CHAT_MESSAGE';

    // Record heartbeat on reply
    SafeChatService.recordHeartbeat(user.id);

    const sessionStatus = SafeChatService.getSessionStatus(matchId);
    let promptText = '✍️ Ketik pesan Anda dan kirimkan:';
    if (['SAFE_CHAT_ACTIVE', 'SAFE_CHAT_PAUSED', 'SAFE_CHAT_WAITING'].includes(sessionStatus.status)) {
      const mins = Math.ceil(sessionStatus.remainingSeconds / 60);
      promptText += `\n\n🛡️ _Sesi aman aktif (${mins} mnt lagi). Nomor HP, username, dan link diblokir otomatis._`;
    }

    await ctx.reply(promptText, { parse_mode: 'Markdown' });
  });

  // ── Private Chat Consent (After 10 min session completes) ─────────────────
  bot.callbackQuery(/consent_yes_(.+)/, async (ctx) => {
    const matchId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    const result = SafeChatService.recordPrivateDecision(matchId, user.id, 'YES');
    await ctx.reply(result.message, { parse_mode: 'Markdown' });

    // If PRIVATE_CHAT_ENABLED, notify partner
    if (result.status === 'PRIVATE_CHAT_ENABLED') {
      const db = getDatabase();
      const match = db.prepare('SELECT user_a_id, user_b_id FROM matches WHERE id = ?').get(matchId) as any;
      if (match) {
        const partnerId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;
        const partnerUser = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(partnerId) as { telegram_id: string } | undefined;
        if (partnerUser) {
          try {
            await ctx.api.sendMessage(
              parseInt(partnerUser.telegram_id),
              '🎉 *Keduanya setuju!* Kalian bisa melanjutkan percakapan di Telegram secara pribadi.',
              { parse_mode: 'Markdown' }
            );
          } catch { /* silent */ }
        }
      }
    }
  });

  bot.callbackQuery(/consent_no_(.+)/, async (ctx) => {
    const matchId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    const result = SafeChatService.recordPrivateDecision(matchId, user.id, 'NO');
    await ctx.reply(result.message, { parse_mode: 'Markdown' });
  });

  // ── End Chat Callback ─────────────────────────────────────────────────────
  bot.callbackQuery(/end_chat_(.+)/, async (ctx) => {
    const matchId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    const result = SafeChatService.endSession(matchId, user.id, 'USER_ENDED');
    await ctx.reply(result.message, { parse_mode: 'Markdown' });
  });

  // ── Legacy: Request Private Contact Exchange (for PRIVATE_CHAT_ENABLED) ────
  bot.callbackQuery(/req_private_(.+)_(.+)/, async (ctx) => {
    const matchId = ctx.match[1];
    const partnerId = ctx.match[2];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    // Only allow if session status is PRIVATE_CHAT_ENABLED
    const sessionStatus = SafeChatService.getSessionStatus(matchId);
    if (sessionStatus.status !== 'PRIVATE_CHAT_ENABLED') {
      await ctx.reply('⚠️ Bertukar kontak hanya tersedia setelah kedua peserta menyetujui lanjut privat.');
      return;
    }

    // Reveal usernames
    const myUser = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(user.id) as { telegram_id: string } | undefined;
    const partnerUser = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(partnerId) as { telegram_id: string } | undefined;
    const myProfile = db.prepare('SELECT display_name FROM profiles WHERE user_id = ?').get(user.id) as { display_name: string } | undefined;
    const partnerProfile = db.prepare('SELECT display_name FROM profiles WHERE user_id = ?').get(partnerId) as { display_name: string } | undefined;

    const handoffNote =
      `🎉 *Pertukaran Kontak Disetujui!*\n\n` +
      `Anda kini dapat saling menghubungi secara pribadi.\n\n` +
      `⚠️ _Komunitas NIVA dibangun atas dasar rasa hormat. Lanjutkan interaksi dengan sopan dan penuh etika._`;

    await ctx.reply(handoffNote, { parse_mode: 'Markdown' });

    if (partnerUser) {
      try {
        await ctx.api.sendMessage(
          parseInt(partnerUser.telegram_id),
          handoffNote,
          { parse_mode: 'Markdown' }
        );
      } catch { /* silent */ }
    }
  });

  // ── Session Status Viewer ──────────────────────────────────────────────────
  bot.callbackQuery(/sandbox_status_(.+)/, async (ctx) => {
    const matchId = ctx.match[1];
    const sessionStatus = SafeChatService.getSessionStatus(matchId);
    await ctx.reply(
      SafeChatService.getStatusBanner(sessionStatus.status, sessionStatus.activeSeconds),
      { parse_mode: 'Markdown' }
    );
  });

  // Block user callback
  bot.callbackQuery(/block_user_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);

    ModerationService.blockUser(user.id, targetUserId, 'Blocked via Safety Action Bar');
    SafeChatService.releaseExclusiveLock(user.id);
    SafeChatService.releaseExclusiveLock(targetUserId);
    await ctx.reply('🚫 Pengguna telah diblokir. Hubungan match dan percakapan telah ditutup.');
  });

  // Unmatch callback
  bot.callbackQuery(/unmatch_(.+)/, async (ctx) => {
    const matchId = ctx.match[1];
    const telegramId = ctx.from.id.toString();
    const user = OnboardingHandler.getOrCreateUser(telegramId);
    const db = getDatabase();

    db.prepare("UPDATE matches SET is_active = 0, unmatched_by = ?, updated_at = datetime('now') WHERE id = ?").run(user.id, matchId);
    SafeChatService.releaseExclusiveLock(user.id);
    await ctx.reply('👋 Anda telah mengakhiri obrolan dan unmatch dengan pengguna ini. Antrean discover Anda kembali terbuka.');
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
    SafeChatService.releaseExclusiveLock(user.id);
    SafeChatService.releaseExclusiveLock(targetUserId);

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
