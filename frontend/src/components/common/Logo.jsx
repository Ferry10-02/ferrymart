import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Logo({ dark = false, to = '/', compact = false }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 select-none">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/25">
        <ShoppingBag className="h-5 w-5" />
      </div>
      {!compact && (
        <div className="leading-none">
          <span
            className={`text-lg font-extrabold tracking-tight ${
              dark ? 'text-white' : 'text-navy-900'
            }`}
          >
            Ferry<span className="text-primary-500">Market</span>
          </span>
          <p className={`text-[10px] font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Multi-Seller Marketplace
          </p>
        </div>
      )}
    </Link>
  );
}
