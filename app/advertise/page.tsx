'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Megaphone, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  Users, 
  FileText, 
  Calendar, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export default function AdvertisePage() {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [campaignType, setCampaignType] = useState('SPONSORED_BLOG');
  const [budgetRange, setBudgetRange] = useState('DIBAWAH_1JT');
  const [targetAudience, setTargetAudience] = useState('Semua Mahasiswa Semarang');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ 
    type: 'success' | 'error'; 
    text: string; 
    ticketId?: string; 
    accessToken?: string; 
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/advertising/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          contactName,
          contactEmail,
          contactPhone,
          campaignType,
          budgetRange,
          targetAudience,
          message,
          honeypot,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ 
          type: 'success', 
          text: data.message,
          ticketId: data.ticketId,
          accessToken: data.accessToken,
        });
        setCompanyName('');
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setMessage('');
      } else {
        setResult({ type: 'error', text: data.error || 'Gagal mengirimkan formulir.' });
      }
    } catch {
      setResult({ type: 'error', text: 'Terjadi kendala jaringan. Silakan coba lagi.' });
    } finally {
      setSubmitting(false);
    }
  };

  const adPackages = [
    {
      title: 'Sponsored Blog',
      icon: <FileText className="w-5 h-5 text-[#8A5A9A]" />,
      desc: 'Artikel edukatif dan bermanfaat yang relevan dengan mahasiswa Semarang, ditinjau secara editorial oleh tim NIVA dengan label transparansi bersponsor.',
      features: ['Penulisan kontekstual', 'Tautan rel="sponsored"', 'Permanen di arsip blog NIVA', 'Distribusi kanal komunitas'],
    },
    {
      title: 'Homepage Placement',
      icon: <Building2 className="w-5 h-5 text-[#5B3A6D]" />,
      desc: 'Penempatan banner atau kartu promosi kontekstual pada halaman utama NIVA untuk brand lokal Semarang yang relevan.',
      features: ['Visibilitas tinggi', 'Desain non-intrusif', 'Slot terbatas per periode', 'Laporan agregat tayangan'],
    },
    {
      title: 'Student Event Promotion',
      icon: <Calendar className="w-5 h-5 text-[#2D8C6A]" />,
      desc: 'Promosi festival kampus, seminar, workshop, kompetisi, atau konser mahasiswa di Kota dan Kabupaten Semarang.',
      features: ['Tarif khusus komunitas kampus', 'Publikasi tanggal event', 'Tautan pendaftaran langsung', 'Dukungan media partner'],
    },
    {
      title: 'Community Spotlight',
      icon: <Users className="w-5 h-5 text-[#E8B4C8]" />,
      desc: 'Sorotan khusus untuk organisasi kemahasiswaan, komunitas kreatif, pegiat seni, dan UMKM kafe di sekitar kampus Semarang.',
      features: ['Wawancara profil komunitas', 'Foto suasana dan lokasi', 'Rekomendasi spot produktif', 'Mendukung ekosistem lokal'],
    },
  ];

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <Megaphone className="w-4 h-4" />
          <span>Kemitraan & Periklanan Kontekstual</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#17151A] tracking-tight">
          Beriklan di NIVA
        </h1>
        <p className="text-base sm:text-lg text-[#68626D] leading-relaxed">
          Jangkau mahasiswa dan pengguna dewasa muda di Kota dan Kabupaten Semarang melalui kanal media yang aman, beretika, dan relevan dengan kehidupan kampus.
        </p>
      </div>

      {/* Value Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center font-bold">
            1
          </div>
          <h3 className="text-lg font-bold text-[#17151A]">Target Lokal Semarang</h3>
          <p className="text-xs text-[#68626D] leading-relaxed">
            Pengguna NIVA terverifikasi berada di area Semarang (Kota & Kabupaten). Materi promosi Anda tersampaikan secara tepat sasaran tanpa pemborosan impresi luar kota.
          </p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center font-bold">
            2
          </div>
          <h3 className="text-lg font-bold text-[#17151A]">Fokus Mahasiswa Aktif</h3>
          <p className="text-xs text-[#68626D] leading-relaxed">
            Terhubung dengan mahasiswa dari 33 perguruan tinggi di Semarang: Tembalang (UNDIP, POLINES), Gunungpati (UNNES), Ngaliyan (UIN), hingga kawasan perkotaan (UDINUS, UNISSULA).
          </p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#2D8C6A]/10 text-[#2D8C6A] flex items-center justify-center font-bold">
            3
          </div>
          <h3 className="text-lg font-bold text-[#17151A]">Aman & Beretika</h3>
          <p className="text-xs text-[#68626D] leading-relaxed">
            Seluruh iklan dimoderasi ketat sesuai <Link href="/advertising-policy" className="text-[#5B3A6D] underline">Kebijakan Iklan NIVA</Link>. Kami menolak penipuan, judi online, pinjol ilegal, dan produk yang merugikan mahasiswa.
          </p>
        </div>
      </div>

      {/* Advertising Packages */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#17151A]">
            Format Kemitraan yang Tersedia
          </h2>
          <p className="text-xs sm:text-sm text-[#68626D]">
            Pilih format promosi yang paling sesuai dengan kebutuhan kampanye Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adPackages.map((pkg, idx) => (
            <div key={idx} className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#FAF8F6] border border-[#5B3A6D]/10">
                    {pkg.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[#17151A]">{pkg.title}</h3>
                </div>
                <p className="text-xs text-[#68626D] leading-relaxed">
                  {pkg.desc}
                </p>
                <ul className="space-y-2 pt-2 border-t border-[#5B3A6D]/10 text-xs text-[#68626D]">
                  {pkg.features.map((f, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D8C6A] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCampaignType(pkg.title === 'Sponsored Blog' ? 'SPONSORED_BLOG' : pkg.title === 'Homepage Placement' ? 'HOMEPAGE_PLACEMENT' : pkg.title === 'Student Event Promotion' ? 'STUDENT_EVENT' : 'COMMUNITY_SPOTLIGHT');
                  const formEl = document.getElementById('ad-form');
                  formEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-[#5B3A6D] bg-[#5B3A6D]/5 hover:bg-[#5B3A6D]/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Ajukan Format Ini</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Inquiry Form Section */}
      <div id="ad-form" className="bg-gradient-to-br from-white via-[#FAF8F6] to-white p-8 sm:p-12 rounded-3xl border border-[#5B3A6D]/15 shadow-soft max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8A5A9A]/10 text-[#8A5A9A] text-xs font-bold">
            <Send className="w-3.5 h-3.5" />
            <span>Formulir Kerjasama</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#17151A]">
            Mulai Diskusi dengan Tim Kemitraan NIVA
          </h2>
          <p className="text-xs sm:text-sm text-[#68626D]">
            Isi formulir di bawah ini. Tim NIVA akan meninjau materi dan menghubungi Anda melalui email resmi dalam waktu 1-2 hari kerja.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs text-[#17151A]">
          {/* Honeypot field for bot trap */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="honeypot"
              tabIndex={-1}
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[#17151A]">Nama Brand / Perusahaan / Komunitas *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Contoh: Kopi Tembalang / BEM KM"
                className="w-full bg-white border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#17151A]">Nama Kontak Penanggung Jawab (PIC) *</label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nama lengkap Anda"
                className="w-full bg-white border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[#17151A]">Alamat Email Resmi *</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                className="w-full bg-white border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#17151A]">Nomor WhatsApp / Telepon (Opsional)</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full bg-white border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-[#17151A]">Jenis Format Promosi *</label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="w-full bg-white border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
              >
                <option value="SPONSORED_BLOG">Sponsored Blog Article</option>
                <option value="HOMEPAGE_PLACEMENT">Homepage Placement Slot</option>
                <option value="STUDENT_EVENT">Student Event Promotion</option>
                <option value="COMMUNITY_SPOTLIGHT">Community Spotlight</option>
                <option value="CAMPAIGN_PARTNERSHIP">Custom Campaign Partnership</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#17151A]">Estimasi Anggaran (Opsional)</label>
              <select
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                className="w-full bg-white border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
              >
                <option value="DIBAWAH_1JT">&lt; Rp 1.000.000</option>
                <option value="1JT_SAMPAI_3JT">Rp 1.000.000 - Rp 3.000.000</option>
                <option value="3JT_SAMPAI_5JT">Rp 3.000.000 - Rp 5.000.000</option>
                <option value="DIATAS_5JT">&gt; Rp 5.000.000</option>
                <option value="CUSTOM">Diskusi Lebih Lanjut</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#17151A]">Target Audiens</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Contoh: Mahasiswa Tembalang"
                className="w-full bg-white border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-[#17151A]">Rincian Rencana Promosi / Pesan *</label>
            <textarea
              rows={4}
              required
              minLength={15}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ceritakan tentang produk, brand, atau event Anda, tujuan kampanye, serta timeline publikasi yang diharapkan..."
              className="w-full bg-white border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#17151A] text-[11px] leading-relaxed">
            <strong>Catatan Kepatuhan:</strong> NIVA berhak menolak materi promosi yang tidak memenuhi <Link href="/advertising-policy" className="text-[#5B3A6D] underline font-semibold">Kebijakan Iklan NIVA</Link>. Kami tidak memalsukan data keterbacaan atau impresi.
          </div>

          {result && (
            <div
              className={`p-4 rounded-2xl text-xs space-y-3 ${
                result.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{result.text}</span>
              </div>

              {result.ticketId && (
                <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-emerald-700">Nomor Tiket Antrean Resmi:</div>
                    <div className="font-mono font-bold text-sm text-[#5B3A6D]">{result.ticketId}</div>
                  </div>
                  <Link
                    href={`/support/ticket/${result.ticketId}${result.accessToken ? `?token=${result.accessToken}` : ''}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5B3A6D] text-white font-semibold text-xs hover:bg-[#4A2F59] transition-all shadow-sm"
                  >
                    <span>💬 Buka Chat / Diskusi Admin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-full font-bold text-sm text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-95 shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Mengirimkan Permohonan...' : 'Kirim Permohonan Kemitraan'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
