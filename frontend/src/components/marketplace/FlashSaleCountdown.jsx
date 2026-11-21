import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const getTargetTimestamp = (endsAt) => {
  if (endsAt) {
    const parsed = new Date(endsAt).getTime();
    if (!Number.isNaN(parsed) && parsed > Date.now()) {
      return parsed;
    }
  }
  // Fallback: next midnight local time for daily Flash Sale wave
  const next = new Date();
  next.setHours(23, 59, 59, 999);
  return next.getTime();
};

const pad = (n) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

export default function FlashSaleCountdown({ endsAt, compact = false }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, getTargetTimestamp(endsAt) - Date.now())
  );

  useEffect(() => {
    const target = getTargetTimestamp(endsAt);
    const update = () => {
      const diff = target - Date.now();
      setRemainingMs(diff > 0 ? diff : 0);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className={`inline-flex items-center gap-1.5 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      {!compact && <Clock className="h-3.5 w-3.5 text-orange-600" />}
      <span className="font-semibold text-slate-500 hidden sm:inline">Berakhir dalam</span>
      <div className="inline-flex items-center gap-1 font-mono font-extrabold">
        <span className="rounded bg-navy-900 px-1.5 py-0.5 text-white shadow-xs">{pad(hours)}</span>
        <span className="text-navy-900">:</span>
        <span className="rounded bg-navy-900 px-1.5 py-0.5 text-white shadow-xs">{pad(minutes)}</span>
        <span className="text-navy-900">:</span>
        <span className="rounded bg-[#EE4D2D] px-1.5 py-0.5 text-white shadow-xs">{pad(seconds)}</span>
      </div>
    </div>
  );
}
