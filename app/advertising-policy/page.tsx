import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, AlertTriangle, FileCheck, ArrowRight, Ban, CheckCircle2 } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Kebijakan Periklanan & Kemitraan Komunitas — NIVA Semarang',
  description: 'Standar etika periklanan resmi NIVA: perlindungan mahasiswa dari scam, penolakan judi online/pinjol ilegal, transparansi label bersponsor, dan hak moderasi editorial.',
  alternates: {
    canonical: '/advertising-policy',
  },
};

export default function AdvertisingPolicyPage() {
  const prohibitedCategories = [
    'Judi online, kasino virtual, slot gacor, atau taruhan daring dalam segala bentuk.',
    'Pinjaman online (pinjol) ilegal, jasa gestun kartu kredit, atau rentenir digital.',
    'Skema piramida (Ponzi), penipuan investasi bodong, robot trading tak berizin OJK/Bappebti.',
    'Layanan seksual komersial, prostitusi daring, konten pornografi, atau produk dewasa eksplisit.',
    'Obat-obatan terlarang, narkotika, psikotropika, atau substansi medis tanpa izin BPOM.',
    'Jasa joki skripsi, joki ujian, atau pemalsuan dokumen akademik almamater.',
    'Penjualan akun curian, malware, spyware, phishing, atau software penyadap perangkat.',
    'Klaim palsu, testimoni kesehatan palsu, atau promosi yang menyesatkan mahasiswa.',
  ];

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Etika & Standar Kemitraan</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-[#17151A] tracking-tight">
          Kebijakan Periklanan & Sponsor NIVA
        </h1>
        <p className="text-sm text-[#68626D]">
          Terakhir diperbarui: September 2026 • Komitmen menjaga ruang digital mahasiswa Semarang yang aman dan bermartabat.
        </p>
      </div>

      <div className="space-y-8 text-sm text-[#68626D] leading-relaxed">
        {/* Section 1 */}
        <section className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">1. Filosofi & Batasan Platform</h2>
          <p>
            NIVA adalah platform social connection yang mengutamakan keselamatan, privasi, dan kesejahteraan mahasiswa di Kota dan Kabupaten Semarang. Oleh karena itu, penerimaan iklan komersial maupun kemitraan komunitas tidak boleh mengorbankan kenyamanan dan keamanan pengguna.
          </p>
          <p>
            Setiap materi promosi yang diajukan ke NIVA melalui halaman <Link href="/advertise" className="text-[#5B3A6D] font-semibold underline">Beriklan di NIVA</Link> wajib melalui proses peninjauan manual oleh tim moderasi sebelum dapat dipublikasikan.
          </p>
        </section>

        {/* Section 2: Prohibited */}
        <section className="bg-rose-500/5 p-7 rounded-2xl border border-rose-500/20 space-y-4">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-lg">
            <Ban className="w-5 h-5 shrink-0" />
            <h2>2. Kategori Produk & Layanan yang Dilarang Keras</h2>
          </div>
          <p className="text-xs text-rose-950">
            NIVA secara tegas menolak seluruh bentuk iklan, sponsor, maupun artikel berbayar yang mempromosikan kategori berikut:
          </p>
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {prohibitedCategories.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-rose-900">
                <span className="font-bold text-rose-600">✕</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Transparency */}
        <section className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">3. Transparansi & Label Bersponsor</h2>
          <p>
            NIVA menjunjung tinggi transparansi informasi kepada pengguna. Seluruh konten berbayar atau promosi kemitraan akan diberi label yang jelas dan tidak disamarkan sebagai artikel editorial independen:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li>Artikel bersponsor ditandai secara visual dengan label <strong>"Konten Bersponsor"</strong> atau <strong>"Sponsored"</strong>.</li>
            <li>Tautan keluar dari artikel bersponsor menggunakan atribut standar <code>rel="sponsored"</code> atau <code>rel="nofollow"</code> sesuai panduan mesin pencari.</li>
            <li>NIVA tidak pernah menjual ulasan positif palsu, rating manipulatif, atau testimoni rekayasa.</li>
          </ul>
        </section>

        {/* Section 4: Rights */}
        <section className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">4. Hak Penolakan & Penghentian Sepihak</h2>
          <p>
            NIVA berhak menolak, mencabut, atau menghentikan penayangan iklan kapan saja apabila:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li>Terdapat laporan penyalahgunaan, penipuan transaksi, atau komplain valid dari pengguna mengenai pengiklan.</li>
            <li>Materi promosi melanggar hukum perundang-undangan Republik Indonesia.</li>
            <li>Pihak pengiklan memalsukan izin operasional usaha atau representasi almamater.</li>
          </ul>
        </section>

        {/* CTA */}
        <div className="p-6 rounded-2xl bg-[#5B3A6D]/5 border border-[#5B3A6D]/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-bold text-[#17151A]">Tertarik Membuka Kemitraan?</h3>
            <p className="text-xs text-[#68626D]">Pelajari paket promosi dan kirimkan proposal kepada tim NIVA.</p>
          </div>
          <Link
            href="/advertise"
            className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] transition-colors shrink-0 flex items-center gap-1.5"
          >
            <span>Buka Halaman Beriklan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
