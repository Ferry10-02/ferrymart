import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store,
  BadgeCheck,
  Package,
  Tags,
  ShoppingBag,
  CreditCard,
  ShieldCheck,
  Receipt,
  BarChart3,
  BellRing,
  MessageSquare,
  FileClock,
  KeyRound,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Ticket,
  Wallet,
  RotateCcw,
} from 'lucide-react';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';

// All Admin Sidebar Menus
const adminNavItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Pengguna', icon: Users },
  { to: '/admin/sellers', label: 'Seller', icon: Store },
  { to: '/admin/seller-verification', label: 'Verifikasi Seller', icon: BadgeCheck },
  { to: '/admin/products', label: 'Produk', icon: Package },
  { to: '/admin/categories', label: 'Kategori', icon: Tags },
  { to: '/admin/coupons', label: 'Voucher & Kupon', icon: Ticket },
  { to: '/admin/orders', label: 'Pesanan', icon: ShoppingBag },
  { to: '/admin/payments', label: 'Pembayaran', icon: CreditCard },
  { to: '/admin/payment-verification', label: 'Verifikasi Pembayaran', icon: ShieldCheck },
  { to: '/admin/payouts', label: 'Pencairan Seller', icon: Wallet },
  { to: '/admin/refunds', label: 'Komplain & Refund', icon: RotateCcw },
  { to: '/admin/transactions', label: 'Transaksi', icon: Receipt },
  { to: '/admin/reports', label: 'Laporan', icon: BarChart3 },
  { to: '/admin/notifications', label: 'WhatsApp & Telegram', icon: BellRing },
  { to: '/admin/chats', label: 'Chat', icon: MessageSquare },
  { to: '/admin/logs', label: 'Log Aktivitas', icon: FileClock },
  { to: '/admin/permissions', label: 'Hak Akses Admin', icon: KeyRound },
  { to: '/admin/settings', label: 'Pengaturan Website', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-950 text-slate-200 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <Logo dark to="/admin" />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-navy-800"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Marketplace
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/50"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

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
            <div>
              <h1 className="text-base font-bold text-navy-900">Administrator FerryMarket</h1>
              <p className="text-xs text-slate-500">Masuk sebagai {user?.fullName} ({user?.email})</p>
            </div>
          </div>
          <span className="rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-primary-400">
            ADMIN PANEL
          </span>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
