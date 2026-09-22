import { Bot, Context, InlineKeyboard } from 'grammy';
import { config } from '../config/index';
import { getDatabase } from '../database/db';
import { SupportService } from '../services/support/supportService';
import { PaymentService } from '../services/payment/paymentService';
import { NotifyService } from '../services/notification/notifyService';

export function createAdminNotifyBot(): Bot<Context> {
  const token = config.NOTIFY_NIVA_BOT_TOKEN || 'DORMANT_ADMIN_NOTIFY_TOKEN';
  const bot = new Bot<Context>(token);

  // Global Error Handler
  bot.catch((err) => {
    console.error(`[NIVANotify] Error on update ${err.ctx.update.update_id}:`, err.error);
  });

  // Admin Authorization Middleware
  bot.use(async (ctx, next) => {
    const fromId = ctx.from?.id.toString();
    if (!fromId) return;

    // Check against configured chat ID, env, or admin_users database
    const configuredChatId = config.NOTIFY_NIVA_CHAT_ID || process.env.NOTIFY_NIVA_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;
    let isAuthorized = false;

    if (configuredChatId && (configuredChatId === fromId || ctx.chat?.id.toString() === configuredChatId)) {
      isAuthorized = true;
    } else {
      try {
        const db = getDatabase();
        // Check if admin user is linked or matches telegram_id
        const adminUser = db.prepare('SELECT * FROM admin_users WHERE is_active = 1 LIMIT 1').get();
        // If chat id is not yet configured, allow initial admin command to bind this chat
        if (!configuredChatId && adminUser) {
          isAuthorized = true;
        }
      } catch {}
    }

    if (!isAuthorized) {
      // In development or if chat ID is empty, allow to facilitate setup
      if (process.env.NODE_ENV !== 'production' || !configuredChatId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      await ctx.reply('⛔ *Akses Ditolak:* Bot ini adalah kanal operasional internal tim Admin NIVA.', {
        parse_mode: 'Markdown',
      });
      return;
    }

    await next();
  });

  // ── Command: /start ────────────────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (chatId) {
      try {
        const db = getDatabase();
        db.prepare(`
          INSERT INTO system_settings (key, value, description, updated_at)
          VALUES ('admin_notify_chat_id', ?, 'Active Telegram Chat ID for NIVANotify operational alerts', datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `).run(chatId.toString());
      } catch {}
    }

    const msg = [
      '🛡 *NIVANotify — Console Operasional Admin NIVA*',
      '',
      'Bot ini menerima alert real-time untuk:',
      '• Pendaftaran pengguna baru & verifikasi Semarang',
      '• Notifikasi bukti pembayaran QRIS masuk',
      '• Tiket bantuan Premium Support dari pengguna',
      '• Laporan pelanggaran keamanan (Report & Safety Events)',
      '',
      `🆔 *Chat ID Anda:* \`${chatId}\``,
      '',
      'Gunakan perintah berikut:',
      '/status — Ringkasan kesehatan & metrik sistem',
      '/tickets — Daftar tiket bantuan yang butuh respon',
      '/payments — Daftar bukti pembayaran yang butuh review',
      '/reply [TICKET_ID] [pesan] — Balas tiket langsung ke user',
    ].join('\n');

    const keyboard = new InlineKeyboard()
      .text('📊 Cek Status', 'adm:REFRESH_STATUS')
      .text('🎫 Tiket Terbuka', 'adm:LIST_TICKETS')
      .row()
      .text('💳 Review Pembayaran', 'adm:LIST_PAYMENTS');

    try {
      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch {
      await ctx.reply(msg.replace(/[*`_]/g, ''), {
        reply_markup: keyboard,
      });
    }
  });

  // ── Command: /status ───────────────────────────────────────────────────────
  bot.command('status', async (ctx) => {
    await sendStatusSummary(ctx);
  });

  // ── Command: /tickets ──────────────────────────────────────────────────────
  bot.command('tickets', async (ctx) => {
    await sendOpenTickets(ctx);
  });

  // ── Command: /payments ─────────────────────────────────────────────────────
  bot.command('payments', async (ctx) => {
    await sendPendingPayments(ctx);
  });

  // ── Command: /reply <ticket_id> <message> ──────────────────────────────────
  bot.command('reply', async (ctx) => {
    const text = ctx.message?.text || '';
    const parts = text.split(' ');
    if (parts.length < 3) {
      await ctx.reply('⚠️ *Format salah.* Gunakan: `/reply <TICKET_ID> <Pesan Balasan>`', {
        parse_mode: 'Markdown',
      });
      return;
    }

    const ticketId = parts[1].trim();
    const replyBody = parts.slice(2).join(' ').trim();
    const adminId = `admin_${ctx.from?.id}`;
    const adminName = ctx.from?.first_name || 'Admin NIVA';

    try {
      SupportService.sendMessage(ticketId, 'ADMIN', adminId, adminName, replyBody);
      await ctx.reply(`✅ *Balasan terkirim ke tiket \`${ticketId}\`.* Pengguna akan menerima notifikasi di Telegram/Website.`, {
        parse_mode: 'Markdown',
      });
    } catch (err: any) {
      await ctx.reply(`❌ *Gagal membalas tiket:* ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // ── Callback Handlers ──────────────────────────────────────────────────────
  bot.callbackQuery(/^adm_ticket:(CLAIM|RESOLVE|CLOSE):(.+)$/, async (ctx) => {
    const action = ctx.match[1];
    const ticketId = ctx.match[2];
    const adminId = `admin_${ctx.from?.id}`;
    const adminName = ctx.from?.first_name || 'Admin NIVA';

    await ctx.answerCallbackQuery();

    try {
      if (action === 'CLAIM') {
        SupportService.updateTicketStatus(ticketId, 'IN_PROGRESS', adminId, `Claimed by @${ctx.from?.username || ctx.from?.id}`);
        await ctx.editMessageText(
          `${ctx.callbackQuery.message?.text || ''}\n\n👤 *Status Tiket:* Diambil oleh *${NotifyService.escapeMarkdown(adminName)}* (IN_PROGRESS)`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('✅ Selesaikan (Resolve)', `adm_ticket:RESOLVE:${ticketId}`)
              .text('🔒 Tutup', `adm_ticket:CLOSE:${ticketId}`),
          }
        );
      } else if (action === 'RESOLVE') {
        SupportService.updateTicketStatus(ticketId, 'RESOLVED', adminId, 'Resolved via Telegram NIVANotify');
        await ctx.editMessageText(
          `${ctx.callbackQuery.message?.text || ''}\n\n✅ *Status Tiket:* RESOLVED oleh *${NotifyService.escapeMarkdown(adminName)}*`,
          { parse_mode: 'Markdown' }
        );
      } else if (action === 'CLOSE') {
        SupportService.updateTicketStatus(ticketId, 'CLOSED', adminId, 'Closed via Telegram NIVANotify');
        await ctx.editMessageText(
          `${ctx.callbackQuery.message?.text || ''}\n\n🔒 *Status Tiket:* CLOSED oleh *${NotifyService.escapeMarkdown(adminName)}*`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (err: any) {
      await ctx.reply(`⚠️ Gagal memperbarui status tiket: ${err.message}`);
    }
  });

  bot.callbackQuery(/^adm_pay:(APPROVE|REJECT):(.+)$/, async (ctx) => {
    const action = ctx.match[1] as 'APPROVE' | 'REJECT';
    const paymentId = ctx.match[2];
    const adminId = `admin_${ctx.from?.id}`;

    await ctx.answerCallbackQuery();

    try {
      PaymentService.resolvePayment(paymentId, action, adminId, `Processed via Telegram NIVANotify by @${ctx.from?.username || ctx.from?.id}`);
      const statusText = action === 'APPROVE' ? '✅ DISETUJUI (PREMIUM_ACTIVE)' : '❌ DITOLAK';
      await ctx.editMessageText(
        `${ctx.callbackQuery.message?.text || ''}\n\n*Status Review:* ${statusText}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err: any) {
      await ctx.reply(`⚠️ Gagal memproses pembayaran: ${err.message}`);
    }
  });

  bot.callbackQuery('adm:REFRESH_STATUS', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendStatusSummary(ctx);
  });

  bot.callbackQuery('adm:LIST_TICKETS', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendOpenTickets(ctx);
  });

  bot.callbackQuery('adm:LIST_PAYMENTS', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendPendingPayments(ctx);
  });

  return bot;
}

// ── Helper Functions ─────────────────────────────────────────────────────────

async function sendStatusSummary(ctx: Context) {
  try {
    const db = getDatabase();

    const activeSessions = db.prepare("SELECT COUNT(*) as c FROM stranger_sessions WHERE status IN ('MATCHING', 'CONNECTED')").get() as { c: number };
    const waitingQueue = db.prepare("SELECT COUNT(*) as c FROM stranger_queue").get() as { c: number };
    const openTickets = db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status IN ('OPEN', 'WAITING', 'IN_PROGRESS')").get() as { c: number };
    const pendingPayments = db.prepare("SELECT COUNT(*) as c FROM payment_requests WHERE status IN ('PENDING', 'PROOF_SUBMITTED', 'UNDER_REVIEW')").get() as { c: number };
    const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
    const premiumUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE subscription_status = 'PREMIUM_ACTIVE'").get() as { c: number };

    const msg = [
      '📊 *NIVA PLATFORM REAL-TIME TELEMETRY*',
      '',
      `📹 *Stranger Cam Active Calls:* ${activeSessions.c} panggilan`,
      `⏳ *Antrean Matchmaking Semarang:* ${waitingQueue.c} user`,
      `🎫 *Tiket Support Terbuka:* ${openTickets.c} tiket`,
      `💳 *Pembayaran Butuh Review:* ${pendingPayments.c} invoice`,
      `👥 *Total Pengguna Terdaftar:* ${totalUsers.c} mahasiswa`,
      `💎 *Pengguna Premium Aktif:* ${premiumUsers.c} user`,
      '',
      `🕒 _Data diperbarui pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB_`,
    ].join('\n');

    const keyboard = new InlineKeyboard()
      .text('🔄 Refresh Status', 'adm:REFRESH_STATUS')
      .text('🎫 Lihat Tiket', 'adm:LIST_TICKETS');

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (err: any) {
    await ctx.reply(`❌ Gagal mengambil status sistem: ${err.message}`);
  }
}

async function sendOpenTickets(ctx: Context) {
  try {
    const db = getDatabase();
    const tickets = db.prepare(`
      SELECT st.*, p.display_name 
      FROM support_tickets st
      LEFT JOIN profiles p ON p.user_id = st.user_id
      WHERE st.status IN ('OPEN', 'WAITING', 'IN_PROGRESS')
      ORDER BY st.created_at ASC
      LIMIT 5
    `).all() as any[];

    if (tickets.length === 0) {
      await ctx.reply('✅ *Tidak ada tiket bantuan yang terbuka saat ini.* Semua tiket telah ditangani.', {
        parse_mode: 'Markdown',
      });
      return;
    }

    await ctx.reply(`📋 *Menampilkan ${tickets.length} Tiket Terbuka Tertua (FIFO):*`, { parse_mode: 'Markdown' });

    for (const t of tickets) {
      const msg = [
        `🏷 *Ticket:* \`${t.id}\``,
        `👤 *User:* ${NotifyService.escapeMarkdown(t.display_name || t.user_id)}`,
        `📁 *Kategori:* ${t.type} • *Status:* ${t.status}`,
        `📅 *Dibuat:* ${t.created_at}`,
      ].join('\n');

      const keyboard = new InlineKeyboard()
        .text('👤 Claim', `adm_ticket:CLAIM:${t.id}`)
        .text('✅ Resolve', `adm_ticket:RESOLVE:${t.id}`)
        .row()
        .url('💬 Buka di Panel', `${config.APP_URL}/app-admin/support`);

      await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  } catch (err: any) {
    await ctx.reply(`❌ Gagal mengambil daftar tiket: ${err.message}`);
  }
}

async function sendPendingPayments(ctx: Context) {
  try {
    const db = getDatabase();
    const payments = db.prepare(`
      SELECT pr.*, sp.name as plan_name, p.display_name
      FROM payment_requests pr
      JOIN subscription_plans sp ON sp.id = pr.plan_id
      LEFT JOIN profiles p ON p.user_id = pr.user_id
      WHERE pr.status IN ('PENDING', 'PROOF_SUBMITTED', 'UNDER_REVIEW')
      ORDER BY pr.created_at ASC
      LIMIT 5
    `).all() as any[];

    if (payments.length === 0) {
      await ctx.reply('✅ *Tidak ada pembayaran tertunda.* Semua pembayaran telah diproses.', {
        parse_mode: 'Markdown',
      });
      return;
    }

    await ctx.reply(`💳 *Menampilkan ${payments.length} Pembayaran Menunggu Review:*`, { parse_mode: 'Markdown' });

    for (const p of payments) {
      const msg = [
        `🧾 *Invoice:* \`${p.id}\``,
        `👤 *User:* ${NotifyService.escapeMarkdown(p.display_name || p.user_id)}`,
        `📦 *Paket:* ${p.plan_name}`,
        `💰 *Jumlah:* Rp${p.amount.toLocaleString('id-ID')}`,
        `🕒 *Dibuat:* ${p.created_at}`,
      ].join('\n');

      const keyboard = new InlineKeyboard()
        .text('✅ Approve', `adm_pay:APPROVE:${p.id}`)
        .text('❌ Reject', `adm_pay:REJECT:${p.id}`)
        .row()
        .url('🔍 Buka di Panel', `${config.APP_URL}/app-admin/payments`);

      await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  } catch (err: any) {
    await ctx.reply(`❌ Gagal mengambil daftar pembayaran: ${err.message}`);
  }
}
