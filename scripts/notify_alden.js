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

let interestsArr = [];
try {
  interestsArr = typeof profile.interests === 'string' ? JSON.parse(profile.interests) : profile.interests;
} catch {
  interestsArr = [];
}
const interestsTags = interestsArr.map(i => `#${String(i).replace(/\s+/g, '')}`).join(' ');

// Modern dating app card caption format (as requested in 2nd screenshot)
const caption = 
  `*${profile.display_name}*, ${profile.age} • 📍 *${profile.coarse_area || 'Semarang'}*\n` +
  `🎓 *${profile.inst_short}* — ${profile.study_field} (Terverifikasi 🛡️)\n` +
  `🎯 *${ProfileHandler.formatIntent(profile.relationship_intent)}*\n\n` +
  `💬 *"${profile.bio || 'Belum mengisi bio.'}"*\n\n` +
  `🏷 ${interestsTags}\n\n` +
  `🔒 _Privasi Aman: NIM, kontak & username tetap dirahasiakan._`;

const keyboard = {
  inline_keyboard: [
    [
      { text: '❤️ Mulai Temukan Teman (Discover)', callback_data: 'cmd_discover' },
      { text: '💬 Matches Saya', callback_data: 'cmd_matches' }
    ],
    [
      { text: '📸 Ganti Foto', callback_data: 'upload_profile_photo' },
      { text: '✏️ Edit Bio', callback_data: 'edit_bio' }
    ],
    [
      { text: '🛡 Pusat Keamanan', callback_data: 'cmd_safety' },
      { text: '⚙ Pengaturan', callback_data: 'cmd_settings' }
    ]
  ]
};

if (profile.photo_file_id) {
  fetch(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: '5764989848',
      photo: profile.photo_file_id,
      caption: caption,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  })
  .then(r => r.json())
  .then(data => {
    console.log('Profile Photo Card sent to Alden:', data.ok ? 'SUCCESS' : data);
  })
  .catch(console.error);
}
