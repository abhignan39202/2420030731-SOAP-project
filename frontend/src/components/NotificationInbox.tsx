'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Notification {
  id: number; eventType: string; title: string; body: string; createdAt: string;
}
export default function NotificationInbox() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function refresh() {
    setLoading(true); setError('');
    try { setNotifications(await apiFetch<Notification[]>('/api/notifications')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load notifications.'); }
    finally { setLoading(false); }
  }
  return <details className="relative" onToggle={event => { if (event.currentTarget.open) void refresh(); }}>
    <summary aria-label="Notifications" className="cursor-pointer list-none rounded-lg p-2 text-teal-500 focus-visible:outline-2"><Bell className="h-5 w-5" /></summary>
    <section aria-label="Notifications" className="absolute right-0 top-12 z-50 max-h-[70vh] w-80 max-w-[85vw] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-xl">
      <div className="mb-3 flex justify-between gap-3"><h2 className="font-bold">Notifications</h2><button disabled={loading} onClick={refresh} className="text-sm text-teal-700 underline">Refresh</button></div>
      {loading ? <p role="status">Loading notifications...</p> : error ? <p role="alert" className="text-rose-700">{error}</p> : !notifications.length ? <p>No notifications yet.</p> :
        <ul className="divide-y divide-slate-100">{notifications.map(item => <li key={item.id} className="space-y-1 py-3 break-words">
          <p className="text-sm font-semibold">{item.title}</p><p className="text-sm">{item.body}</p><time className="text-xs text-slate-500" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
        </li>)}</ul>}
    </section>
  </details>;
}
