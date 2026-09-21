import { config } from '../dist/config/index.js';
import { getDatabase } from '../dist/database/db.js';
import { ProfileHandler } from '../dist/bot/handlers/profile.js';

const db = getDatabase();
const userId = '091f2018-1173-4cc5-aca8-f52844fce601';

const profile = db.prepare(`
  SELECT p.*, i.name as inst_name, i.short_name as inst_short 
  FROM profiles p 
  JOIN institutions i ON i.id = p.institution_id 
  WHERE p.user_id = ?
`).get(userId);

const previewText = ProfileHandler.renderProfilePreview(profile, profile.inst_short);

const payload = {
  chat_id: '5764989848',
  text: `🎉 *Profil Anda Berhasil Disimpan & Diverifikasi!*\n\n${previewText}`,
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: [
      [
        { text: '❤️ Mulai Temukan Teman (Discover)', callback_data: 'cmd_discover' },
        { text: '💬 Matches Saya', callback_data: 'cmd_matches' }
      ],
      [
        { text: '👤 Profil Saya', callback_data: 'cmd_my_profile' },
        { text: '🛡 Pusat Keamanan', callback_data: 'cmd_safety' }
      ],
      [
        { text: '⚙ Pengaturan', callback_data: 'cmd_settings' }
      ]
    ]
  }
};

fetch(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(data => {
  console.log('Notification sent to Alden:', data.ok ? 'SUCCESS' : data);
})
.catch(console.error);
