import { Wallet, Package, Truck, Star, CheckCircle2, XCircle } from 'lucide-react';

const STEPS = [
  { key: 'BELUM_BAYAR', label: 'Belum Bayar', icon: Wallet },
  { key: 'DIKEMAS', label: 'Dikemas', icon: Package },
  { key: 'DIKIRIM', label: 'Dikirim', icon: Truck },
  { key: 'SELESAI', label: 'Selesai', icon: CheckCircle2 },
];

const getStepIndexFromStatus = (status) => {
  if (['PENDING_PAYMENT', 'WAITING_VERIFICATION'].includes(status)) return 0;
  if (['PAID', 'CONFIRMED', 'PROCESSING'].includes(status)) return 1;
  if (['SHIPPED', 'DELIVERED'].includes(status)) return 2;
  if (status === 'COMPLETED') return 3;
  return -1;
};

export default function OrderProgressStepper({ status, hasUnreviewedItems = false, compact = false }) {
  if (['CANCELLED', 'REFUNDED'].includes(status)) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700">
        <XCircle className="h-4 w-4 shrink-0" />
        <span>Pesanan ini telah {status === 'REFUNDED' ? 'di-refund' : 'dibatalkan'}.</span>
      </div>
    );
  }

  const activeIdx = getStepIndexFromStatus(status);

  return (
    <div className={compact ? 'py-2' : 'py-3'}>
      <div className="relative flex items-center justify-between">
        {/* Background track */}
        <div className="absolute left-5 right-5 top-4 h-0.5 bg-slate-200" />
        {/* Active progress fill */}
        <div
          className="absolute left-5 top-4 h-0.5 bg-primary-500 transition-all duration-300"
          style={{
            width: activeIdx <= 0 ? '0%' : `calc(${(activeIdx / (STEPS.length - 1)) * 100}% - 40px)`,
          }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeIdx || (idx === 3 && activeIdx === 3);
          const isCurrent = idx === activeIdx;
          const Icon = idx === 3 && activeIdx === 3 && hasUnreviewedItems ? Star : step.icon;
          const label = idx === 3 && activeIdx === 3 && hasUnreviewedItems ? 'Beri Penilaian' : step.label;

          return (
            <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center text-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                  isCompleted
                    ? 'border-primary-500 bg-primary-500 text-white shadow-xs'
                    : isCurrent
                    ? 'border-primary-500 bg-white text-primary-600 ring-4 ring-primary-100'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={`mt-1.5 text-[11px] font-semibold leading-tight ${
                  isCurrent
                    ? 'text-primary-600'
                    : isCompleted
                    ? 'text-navy-900'
                    : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
