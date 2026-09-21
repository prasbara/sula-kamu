'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Camera, Check, X, Eye } from 'lucide-react';

export default function AdminVerificationPage() {
  const [photoQueue, setPhotoQueue] = useState<any[]>([]);
  const [ktmQueue, setKtmQueue] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'PHOTO' | 'KTM'>('PHOTO');
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueues = () => {
    setIsLoading(true);
    fetch('/api/admin/verification?type=ALL')
      .then((res) => res.json())
      .then((data) => {
        setPhotoQueue(data.photoQueue || []);
        setKtmQueue(data.ktmQueue || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  const handleResolve = async (type: 'PHOTO' | 'KTM', id: string, action: 'APPROVE' | 'REJECT') => {
    const notes = prompt(`Alasan keputusan ${action}:`) || '';
    const res = await fetch('/api/admin/verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationType: type, id, action, notes }),
    });

    if (res.ok) {
      alert(`Verifikasi berhasil ${action === 'APPROVE' ? 'disetujui' : 'ditolak'}.`);
      fetchQueues();
    } else {
      const err = await res.json();
      alert(`Gagal: ${err.error}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Verification Review Queues
          </h1>
          <p className="text-xs text-[#9D93A8] mt-1">
            Tinjau pengajuan verifikasi keaslian foto dan kartu mahasiswa (FIFO).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('PHOTO')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'PHOTO'
                ? 'bg-sky-600 text-white'
                : 'bg-[#171420] text-[#9D93A8] hover:text-white border border-[#2B2438]'
            }`}
          >
            📸 Photo Queue ({photoQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('KTM')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'KTM'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#171420] text-[#9D93A8] hover:text-white border border-[#2B2438]'
            }`}
          >
            🎓 KTM Queue ({ktmQueue.length})
          </button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-[#171420] border border-[#2B2438] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#9D93A8]">Memuat antrean verifikasi...</div>
        ) : activeTab === 'PHOTO' ? (
          photoQueue.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#9D93A8]">Tidak ada antrean verifikasi foto saat ini.</div>
          ) : (
            <div className="divide-y divide-[#2B2438]/50">
              {photoQueue.map((item) => (
                <div key={item.verification_id} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-white text-xs">
                      {item.display_name} ({item.institution_short_name})
                    </div>
                    <div className="text-[10px] text-[#9D93A8]">
                      User ID: <span className="font-mono text-[#C8BED4]">{item.user_id}</span> • Masuk:{' '}
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolve('PHOTO', item.verification_id, 'APPROVE')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleResolve('PHOTO', item.verification_id, 'REJECT')}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : ktmQueue.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#9D93A8]">Tidak ada antrean verifikasi KTM saat ini.</div>
        ) : (
          <div className="divide-y divide-[#2B2438]/50">
            {ktmQueue.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold text-white text-xs">
                    {item.display_name} ({item.institution_short_name})
                  </div>
                  <div className="text-[10px] text-[#9D93A8]">
                    ID: <span className="font-mono text-[#C8BED4]">{item.id}</span> • Keyakinan OCR:{' '}
                    {item.ocr_confidence}%
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResolve('KTM', item.id, 'APPROVE')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleResolve('KTM', item.id, 'REJECT')}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
