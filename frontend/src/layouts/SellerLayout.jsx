import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  QrCode,
  MessageSquare,
  Wallet,
  BarChart3,
  Settings,
  Store,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/UIStates';

const navItems = [
  { to: '/seller', label: 'Ringkasan', icon: LayoutDashboard, end: true },
  { to: '/seller/products', label: 'Produk & Stok', icon: Package },
  { to: '/seller/qr', label: 'QR Code Produk', icon: QrCode },
  { to: '/seller/orders', label: 'Pesanan & Kirim', icon: ShoppingBag },
  { to: '/seller/transactions', label: 'Riwayat Transaksi', icon: Wallet },
  { to: '/seller/reports', label: 'Laporan Penjualan', icon: BarChart3 },
  { to: '/seller/chat', label: 'Chat Pembeli', icon: MessageSquare },
  { to: '/seller/settings', label: 'Pengaturan Toko', icon: Settings },
];

export default function SellerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const seller = user?.sellerProfile;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 text-slate-200 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <Logo dark to="/seller" />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/20 text-primary-400">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{seller?.storeName || 'Toko Saya'}</p>
              <div className="mt-1">
                <StatusBadge status={seller?.verificationStatus || 'PENDING'} />
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-navy-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Marketplace
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-950/50"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-bold text-navy-900">Seller Center FerryMarket</h1>
          </div>
          {seller?.storeSlug && (
            <Link to={`/store/${seller.storeSlug}`} className="btn-outline px-3 py-1.5 text-xs">
              Lihat Halaman Toko
            </Link>
          )}
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
