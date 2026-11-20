import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Heart,
  MessageSquare,
  Bell,
  User,
  Store,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Package,
} from 'lucide-react';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';

export default function MarketplaceLayout() {
  const { user, isAuthenticated, hasRole, logout } = useAuth();
  const { cart } = useCart();
  const { unreadNotifications } = useSocket() || {};
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      {/* Top utility strip */}
      <div className="bg-navy-900 text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-4">
            <span>Marketplace Multi-Seller Modern & Terpercaya</span>
            {hasRole('SELLER') ? (
              <Link to="/seller" className="font-semibold text-primary-400 hover:text-primary-300">
                Seller Center
              </Link>
            ) : (
              <Link to="/register?role=SELLER" className="hover:text-white">
                Mulai Berjualan
              </Link>
            )}
            {hasRole('ADMIN') && (
              <Link to="/admin" className="font-semibold text-amber-400 hover:text-amber-300">
                Dashboard Admin
              </Link>
            )}
          </div>
          <div className="hidden items-center gap-4 sm:flex">
            <Link to="/products?flash_sale=true" className="hover:text-white">
              Flash Sale
            </Link>
            <Link to="/orders" className="hover:text-white">
              Lacak Pesanan
            </Link>
          </div>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Logo />

          {/* Search Form */}
          <form onSubmit={handleSearch} className="hidden flex-1 md:flex">
            <div className="relative flex w-full max-w-2xl">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari produk, kategori, atau nama toko di FerryMarket..."
                className="w-full rounded-l-xl border-2 border-primary-500 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-r-xl bg-primary-500 px-5 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                <Search className="h-4 w-4" /> Cari
              </button>
            </div>
          </form>

          {/* Right Action Icons */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/cart"
                  title="Keranjang Belanja"
                  className="relative rounded-xl p-2.5 text-slate-700 hover:bg-slate-100"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cart?.summary?.totalItems > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white">
                      {cart.summary.totalItems}
                    </span>
                  )}
                </Link>
                <Link
                  to="/wishlist"
                  title="Favorit"
                  className="hidden rounded-xl p-2.5 text-slate-700 hover:bg-slate-100 sm:inline-flex"
                >
                  <Heart className="h-5 w-5" />
                </Link>
                <Link
                  to="/chat"
                  title="Chat"
                  className="inline-flex rounded-xl p-2.5 text-slate-700 hover:bg-slate-100"
                >
                  <MessageSquare className="h-5 w-5" />
                </Link>
                <Link
                  to="/notifications"
                  title="Notifikasi"
                  className="relative inline-flex rounded-xl p-2.5 text-slate-700 hover:bg-slate-100"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </Link>

                <div className="relative ml-1 hidden items-center gap-2 border-l border-slate-200 pl-3 md:flex">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100"
                  >
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                        {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="max-w-[120px] text-left leading-tight">
                      <p className="truncate text-xs font-bold text-navy-900">{user?.fullName}</p>
                      <p className="text-[10px] text-slate-500">{user?.roles?.join(', ')}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Logout"
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login" className="btn-outline px-4 py-2 text-xs">
                  Masuk
                </Link>
                <Link to="/register" className="btn-primary px-4 py-2 text-xs">
                  Daftar
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search & Menu */}
        <div className="border-t border-slate-100 px-4 py-2 md:hidden">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari produk di FerryMarket..."
              className="w-full rounded-l-lg border border-primary-500 px-3 py-2 text-sm focus:outline-none"
            />
            <button type="submit" className="rounded-r-lg bg-primary-500 px-4 text-white">
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="py-1.5 font-medium">
                Semua Produk
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-1.5">
                    <Package className="h-4 w-4" /> Pesanan Saya
                  </Link>
                  <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-1.5">
                    <Heart className="h-4 w-4" /> Favorit
                  </Link>
                  <Link to="/chat" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-1.5">
                    <MessageSquare className="h-4 w-4" /> Chat
                  </Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-1.5">
                    <User className="h-4 w-4" /> Profil & Alamat
                  </Link>
                  {hasRole('SELLER') && (
                    <Link to="/seller" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-1.5 font-semibold text-primary-600">
                      <Store className="h-4 w-4" /> Dashboard Seller
                    </Link>
                  )}
                  {hasRole('ADMIN') && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-1.5 font-semibold text-navy-900">
                      <ShieldCheck className="h-4 w-4" /> Dashboard Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="mt-2 flex items-center gap-2 py-1.5 text-left font-semibold text-red-600"
                  >
                    <LogOut className="h-4 w-4" /> Keluar
                  </button>
                </>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn-outline">
                    Masuk
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn-primary">
                    Daftar
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-navy-900 text-slate-300">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo dark />
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Platform marketplace multi-seller modern dengan transaksi transparan, pembayaran manual terverifikasi Admin, chat realtime, dan sistem QR Code produk & pesanan.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Jelajahi</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li><Link to="/products" className="hover:text-primary-400">Semua Produk</Link></li>
              <li><Link to="/products?flash_sale=true" className="hover:text-primary-400">Flash Sale</Link></li>
              <li><Link to="/products?sort=bestselling" className="hover:text-primary-400">Produk Terlaris</Link></li>
              <li><Link to="/products?sort=newest" className="hover:text-primary-400">Produk Terbaru</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Pembeli & Seller</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li><Link to="/orders" className="hover:text-primary-400">Riwayat Pesanan</Link></li>
              <li><Link to="/cart" className="hover:text-primary-400">Keranjang Belanja</Link></li>
              <li><Link to="/register?role=SELLER" className="hover:text-primary-400">Daftar Sebagai Seller</Link></li>
              <li><Link to="/seller" className="hover:text-primary-400">Seller Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Keamanan Transaksi</h4>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Setiap pembayaran transfer manual diverifikasi langsung oleh tim Admin FerryMarket sebelum diteruskan ke Seller. Data percakapan dan QR pesanan dilindungi autentikasi & hak akses.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} FerryMarket. Seluruh hak cipta dilindungi.
        </div>
      </footer>
    </div>
  );
}
