'use client';

import { useState, useEffect } from 'react';

interface AuditLogItem {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = actionFilter ? `?action=${actionFilter}` : '';
      const res = await fetch(`/api/admin/audit${q}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            🛡️ Log Audit & Aktivitas Administratif
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Rekam jejak tidak dapat diubah (append-only) untuk seluruh tindakan sensitif administrator.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter Aksi (cth: LOGIN, APPROVE)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Memuat log audit...</div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl mt-6">
          Tidak ada riwayat audit ditemukan.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-slate-900/40">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/5 font-semibold">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Admin</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Target Type / ID</th>
                <th className="py-3 px-4">Keterangan / Detail</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => {
                let parsedDetails = log.details;
                try {
                  const obj = JSON.parse(log.details);
                  parsedDetails = JSON.stringify(obj, null, 1);
                } catch {}

                return (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                      {log.admin_name || log.admin_id}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-white/10 text-rose-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {log.target_type && (
                        <span className="text-slate-500 mr-1">[{log.target_type}]</span>
                      )}
                      {log.target_id || '-'}
                    </td>
                    <td className="py-3 px-4 max-w-xs md:max-w-md truncate font-mono text-[11px] text-slate-300">
                      {parsedDetails}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
