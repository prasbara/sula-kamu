import type { Metadata } from 'next';
import Link from 'next/link';
import { HeartHandshake, CheckCircle2, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pedoman Komunitas Mahasiswa — NIVA Semarang',
  description: 'Aturan etika dan standar perilaku komunitas NIVA: saling menghargai, larangan pelecehan, kencan yang sehat, dan perlindungan privasi sesama mahasiswa.',
  alternates: {
    canonical: '/community-guidelines',
  },
};

export default function CommunityGuidelinesPage() {
  const allowed = [
    'Bersikap sopan, ramah, dan menghormati batasan kenyamanan orang lain.',
    'Menampilkan foto profil diri asli yang pantas dan mencerminkan kehidupan mahasiswa.',
    'Menerima penolakan atau ketidaksediaan mengobrol secara dewasa tanpa memaksakan kehendak.',
    'Menjaga kerahasiaan percakapan dan tidak menyebarkan tangkapan layar (screenshot) ke media sosial publik.',
    'Melaporkan perilaku mencurigakan demi menjaga keamanan ekosistem kampus bersama.',
  ];

  const prohibited = [
    'Mengirimkan konten seksual eksplisit, foto telanjang, atau ajakan asusila.',
    'Melakukan tindakan pelecehan verbal, intimidasi, *hate speech*, atau ujaran kebencian.',
    'Memanfaatkan platform untuk aktivitas komersial: jualan produk, joki tugas, MLM, atau promosi berbayar.',
    'Menggunakan kartu identitas mahasiswa milik orang lain atau memalsukan almamater (*catfishing*).',
    'Meminta uang, pinjaman online, pulsa, atau transaksi keuangan dalam bentuk apa pun.',
  ];

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <HeartHandshake className="w-4 h-4" />
          <span>Etika & Standar Komunitas</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-[#17151A] tracking-tight">
          Pedoman Komunitas NIVA
        </h1>
        <p className="text-base text-[#68626D] max-w-2xl mx-auto">
          NIVA dibangun untuk memfasilitasi pertemanan yang tulus dan berkualitas di kalangan mahasiswa Semarang. Seluruh pengguna wajib mematuhi panduan ini.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Do's */}
        <div className="p-8 rounded-2xl bg-white border border-[#2D8C6A]/20 shadow-soft space-y-4">
          <div className="flex items-center gap-2 text-[#2D8C6A] font-bold text-lg">
            <CheckCircle2 className="w-6 h-6" />
            <h2>Hal yang Diharapkan</h2>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-[#68626D]">
            {allowed.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="text-[#2D8C6A] font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Don'ts */}
        <div className="p-8 rounded-2xl bg-white border border-[#C94B5B]/20 shadow-soft space-y-4">
          <div className="flex items-center gap-2 text-[#C94B5B] font-bold text-lg">
            <XCircle className="w-6 h-6" />
            <h2>Hal yang Dilarang Keras</h2>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-[#68626D]">
            {prohibited.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="text-[#C94B5B] font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Enforcement Alert */}
      <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/15 space-y-3">
        <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[#5B3A6D]" />
          <span>Sanksi Pelanggaran</span>
        </h3>
        <p className="text-xs sm:text-sm text-[#68626D] leading-relaxed">
          Akun yang terbukti melanggar pedoman komunitas—terutama terkait pelecehan, konten pornografi, penipuan, atau pemalsuan identitas—akan dikenakan sanksi berupa teguran keras, penangguhan sementara, hingga pemblokiran permanen tanpa toleransi.
        </p>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/safety"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5B3A6D] hover:text-[#8A5A9A]"
        >
          <span>Ketahui fitur keselamatan kami di Pusat Keamanan</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
