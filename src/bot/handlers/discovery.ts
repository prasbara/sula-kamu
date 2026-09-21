import { InlineKeyboard } from 'grammy';
import { DiscoveryCard, MatchingService } from '../../services/matchmaking/matchingService.js';
import { ProfileHandler } from './profile.js';

export class DiscoveryHandler {
  public static renderCardText(card: DiscoveryCard, remainingLikes: number): string {
    let interestsArr: string[] = [];
    if (Array.isArray(card.interests)) {
      interestsArr = card.interests;
    } else if (typeof card.interests === 'string') {
      try {
        interestsArr = JSON.parse(card.interests);
      } catch {
        interestsArr = [];
      }
    }
    const interestsTags = interestsArr.map((i) => `#${String(i).replace(/\s+/g, '')}`).join(' ');
    const commonNotice = card.mutualInterestsCount > 0 
      ? `\n🤝 *${card.mutualInterestsCount} Minat yang Sama!*\n` 
      : '';

    let verifLabel = 'Unverified';
    if ((card as any).verificationTier === 'STUDENT_VERIFIED') {
      verifLabel = 'Student Verified 🛡️';
    } else if ((card as any).verificationTier === 'PHOTO_VERIFIED') {
      verifLabel = 'Photo Verified 👤';
    }

    return (
      `*${card.displayName}*, ${card.age} • 📍 *${card.coarseArea || 'Semarang'}*\n` +
      `🎓 *${card.institutionShortName}* — ${card.studyField} (${verifLabel})\n` +
      `🎯 *${ProfileHandler.formatIntent(card.relationshipIntent as any)}*\n` +
      `${commonNotice}` +
      `\n💬 *"${card.bio || 'Belum mengisi bio.'}"*\n\n` +
      `🏷 ${interestsTags || '-'}\n\n` +
      `⚡ _Sisa Like Hari Ini: ${remainingLikes}_`
    );
  }

  public static getCardKeyboard(targetUserId: string): InlineKeyboard {
    return new InlineKeyboard()
      .text('❤️ Suka', `like_${targetUserId}`)
      .text('❌ Lewati', `pass_${targetUserId}`)
      .row()
      .text('🚨 Laporkan Akun', `report_${targetUserId}`)
      .text('👤 Profil Saya', 'cmd_my_profile');
  }

  public static renderMutualMatchMessage(partner: DiscoveryCard): string {
    return (
      `🎉 *IT'S A MUTUAL MATCH!* 🎉\n\n` +
      `Anda dan *${partner.displayName}* (${partner.institutionShortName}) saling menyukai!\n\n` +
      `💬 Ruang obrolan aman Anda telah dibuka di menu *Matches*.\n` +
      `Privasi Anda tetap terjaga — Anda dapat berkomunikasi melalui SULA tanpa membagikan nomor HP atau ID pribadi hingga Anda merasa nyaman.\n\n` +
      `💡 *Tips Percakapan:* Mulailah dengan menyapa dan mendiskusikan minat bersama Anda!`
    );
  }

  public static async sendCard(ctx: any, card: DiscoveryCard, remainingLikes: number): Promise<void> {
    const text = this.renderCardText(card, remainingLikes);
    const keyboard = this.getCardKeyboard(card.userId);

    if (card.photoFileId) {
      try {
        await ctx.replyWithPhoto(card.photoFileId, {
          caption: text,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
        return;
      } catch {
        // Fallback to text if photo fails
      }
    }

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
}
