import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Flame,
  Sparkles,
  Tag,
  ThumbsUp,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Shirt,
  ShoppingBag,
  HeartPulse,
  Home,
  UtensilsCrossed,
  Dumbbell,
  Car,
  Gamepad2,
  Laptop,
  Watch,
  Baby,
  BookOpen,
  ShieldCheck,
  QrCode,
  MessageSquare,
  Wallet,
  Package,
  Truck,
  Star,
  Heart,
  Store,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ProductCard from '../../components/marketplace/ProductCard';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/UIStates';

const CATEGORY_ICONS = {
  Smartphone,
  Shirt,
  ShoppingBag,
  Sparkles,
  HeartPulse,
  Home,
  UtensilsCrossed,
  Dumbbell,
  Car,
  Gamepad2,
  Laptop,
  Watch,
  Baby,
  BookOpen,
};

function ProductSection({ title, icon: Icon, iconColor = 'text-primary-500', products, viewAllTo, badge }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-xs border border-slate-200 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-navy-900">{title}</h2>
              {badge && (
                <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[11px] font-bold text-primary-700">
                  {badge}
                </span>
              )}
            </div>
          </div>
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Lihat Semua <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { isAuthenticated, hasRole } = useAuth();
  const { orderSummary } = useSocket() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeBanner, setActiveBanner] = useState(0);

  const loadHome = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/products/home');
      setData(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  const heroBanners = (data?.banners || []).filter((b) => b.position === 'HERO');
  const sideBanners = (data?.banners || []).filter((b) => b.position === 'PROMO_SIDE');

  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % heroBanners.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [heroBanners.length]);

  if (loading) return <LoadingState message="Memuat katalog FerryMarket..." />;
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error} onRetry={loadHome} />
      </div>
    );
  }

  const currentHero = heroBanners[activeBanner] || null;
  const hasAnyProducts =
    (data?.recommended?.length || 0) > 0 ||
    (data?.newest?.length || 0) > 0 ||
    (data?.bestSelling?.length || 0) > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Hero Banner & Side Promo */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="relative overflow-hidden rounded-2xl bg-navy-900 lg:col-span-8 min-h-[260px] sm:min-h-[320px]">
          {currentHero ? (
            <>
              <img
                src={currentHero.imageUrl}
                alt={currentHero.title}
                className="absolute inset-0 h-full w-full object-cover opacity-55"
              />
              <div className="relative z-10 flex h-full flex-col justify-end bg-gradient-to-t from-navy-950/90 via-navy-900/40 to-transparent p-6 sm:p-8">
                <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-primary-500 px-3 py-1 text-xs font-bold text-white">
                  <Zap className="h-3.5 w-3.5 fill-white" /> Promo Pilihan FerryMarket
                </span>
                <h1 className="max-w-xl text-2xl font-extrabold text-white sm:text-3xl">
                  {currentHero.title}
                </h1>
                {currentHero.subtitle && (
                  <p className="mt-2 max-w-lg text-sm text-slate-200">{currentHero.subtitle}</p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to={currentHero.linkUrl || '/products'} className="btn-primary">
                    Belanja Sekarang
                  </Link>
                  <Link to="/register?role=SELLER" className="btn-outline border-white/30 bg-white/10 text-white hover:bg-white/20">
                    Buka Toko Gratis
                  </Link>
                </div>
              </div>
              {heroBanners.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveBanner((p) => (p - 1 + heroBanners.length) % heroBanners.length)
                    }
                    className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-2 text-navy-900 hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBanner((p) => (p + 1) % heroBanners.length)}
                    className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-2 text-navy-900 hover:bg-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col justify-center p-8 text-white">
              <h1 className="text-3xl font-extrabold">Selamat Datang di FerryMarket</h1>
              <p className="mt-2 max-w-lg text-sm text-slate-300">
                Temukan ribuan produk terbaik dari seller terverifikasi di seluruh Indonesia.
              </p>
              <Link to="/products" className="btn-primary mt-5 w-fit">
                Jelajahi Produk
              </Link>
            </div>
          )}
        </div>

        {/* Side Highlights */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          {sideBanners[0] ? (
            <Link
              to={sideBanners[0].linkUrl || '/register?role=SELLER'}
              className="group relative flex-1 overflow-hidden rounded-2xl bg-navy-900 p-5 text-white min-h-[150px]"
            >
              <img
                src={sideBanners[0].imageUrl}
                alt={sideBanners[0].title}
                className="absolute inset-0 h-full w-full object-cover opacity-40 transition group-hover:scale-105"
              />
              <div className="relative z-10 flex h-full flex-col justify-end">
                <h3 className="text-lg font-bold">{sideBanners[0].title}</h3>
                <p className="mt-1 text-xs text-slate-200">{sideBanners[0].subtitle}</p>
              </div>
            </Link>
          ) : null}

          <div className="card grid grid-cols-3 gap-2 p-4 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="h-6 w-6 text-primary-500" />
              <p className="mt-1.5 text-[11px] font-bold text-navy-900">Verifikasi Admin</p>
              <p className="text-[10px] text-slate-500">Transfer Manual Aman</p>
            </div>
            <div className="flex flex-col items-center">
              <QrCode className="h-6 w-6 text-primary-500" />
              <p className="mt-1.5 text-[11px] font-bold text-navy-900">QR Produk & Order</p>
              <p className="text-[10px] text-slate-500">Scan Cepat & Aman</p>
            </div>
            <div className="flex flex-col items-center">
              <MessageSquare className="h-6 w-6 text-primary-500" />
              <p className="mt-1.5 text-[11px] font-bold text-navy-900">Chat Realtime</p>
              <p className="text-[10px] text-slate-500">Langsung ke Seller</p>
            </div>
          </div>
        </div>
      </section>

      {/* Shopee-Style Quick Feature Bar & Connected Order Status Strip */}
      <section className="mt-5 space-y-3">
        <div className="card grid grid-cols-3 gap-2 p-3 sm:grid-cols-6 sm:p-4">
          {[
            { to: '/products?flash_sale=true', label: 'Flash Sale', icon: Zap, bg: 'bg-orange-100 text-orange-600' },
            { to: '/products?discounted=true', label: 'Diskon Xtra', icon: Tag, bg: 'bg-emerald-100 text-emerald-600' },
            { to: '/products?sort=bestselling', label: 'Terlaris', icon: Flame, bg: 'bg-rose-100 text-rose-600' },
            { to: isAuthenticated ? '/orders' : '/login', label: 'Pesanan Saya', icon: Package, bg: 'bg-sky-100 text-sky-600' },
            { to: isAuthenticated ? '/wishlist' : '/login', label: 'Favorit', icon: Heart, bg: 'bg-pink-100 text-pink-600' },
            {
              to: hasRole('SELLER') ? '/seller' : isAuthenticated ? '/profile' : '/register?role=SELLER',
              label: hasRole('SELLER') ? 'Seller Center' : 'Buka Toko',
              icon: Store,
              bg: 'bg-indigo-100 text-indigo-600',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className="group flex flex-col items-center rounded-xl py-2 text-center transition hover:bg-slate-50"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.bg} transition group-hover:scale-105`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-primary-600">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {isAuthenticated && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white px-4 py-2.5">
              <span className="text-xs font-extrabold text-navy-900">Status Pesanan Saya</span>
              <Link
                to="/orders"
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary-600 hover:underline"
              >
                Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2 px-2 py-3 sm:px-6">
              {[
                { label: 'Belum Bayar', count: orderSummary?.belumBayar || 0, icon: Wallet, to: '/orders?tab=BELUM_BAYAR' },
                { label: 'Dikemas', count: orderSummary?.dikemas || 0, icon: Package, to: '/orders?tab=DIKEMAS' },
                { label: 'Dikirim', count: orderSummary?.dikirim || 0, icon: Truck, to: '/orders?tab=DIKIRIM' },
                { label: 'Beri Penilaian', count: orderSummary?.beriPenilaian || 0, icon: Star, to: '/orders?tab=BERI_PENILAIAN' },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.label}
                    to={s.to}
                    className="group flex flex-col items-center rounded-xl py-1.5 text-center transition hover:bg-orange-50/70"
                  >
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-navy-800 transition group-hover:bg-primary-100 group-hover:text-primary-600">
                      <Icon className="h-4.5 w-4.5" />
                      {s.count > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#EE4D2D] px-1 text-[9px] font-extrabold text-white">
                          {s.count > 99 ? '99+' : s.count}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 text-[11px] font-semibold text-slate-700 group-hover:text-primary-600">
                      {s.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Categories Grid (14 Initial Categories) */}
      <section className="card mt-8 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold uppercase tracking-wide text-navy-900">
            Kategori Produk
          </h2>
          <Link to="/products" className="text-xs font-semibold text-primary-600 hover:underline">
            Lihat Semua Kategori
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7">
          {(data?.categories || []).map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] || Tag;
            return (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="group flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center transition hover:border-primary-300 hover:bg-primary-50/60"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary-600 shadow-xs transition group-hover:bg-primary-500 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="mt-2 line-clamp-2 text-xs font-semibold text-slate-700 group-hover:text-primary-700">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Flash Sale */}
      <ProductSection
        title="Flash Sale"
        icon={Zap}
        iconColor="text-orange-600"
        badge="TERBATAS"
        products={data?.flashSale}
        viewAllTo="/products?flash_sale=true"
      />

      {/* Best Selling */}
      <ProductSection
        title="Produk Terlaris"
        icon={Flame}
        iconColor="text-red-500"
        products={data?.bestSelling}
        viewAllTo="/products?sort=bestselling"
      />

      {/* Discounted */}
      <ProductSection
        title="Produk Diskon"
        icon={Tag}
        iconColor="text-emerald-600"
        products={data?.discounted}
        viewAllTo="/products?discounted=true"
      />

      {/* Newest */}
      <ProductSection
        title="Produk Terbaru"
        icon={Sparkles}
        iconColor="text-sky-600"
        products={data?.newest}
        viewAllTo="/products?sort=newest"
      />

      {/* Recommended */}
      <ProductSection
        title="Rekomendasi Untuk Anda"
        icon={ThumbsUp}
        iconColor="text-primary-600"
        products={data?.recommended}
        viewAllTo="/products"
      />

      {!hasAnyProducts && (
        <div className="mt-10">
          <EmptyState
            icon={ShoppingBag}
            title="Belum Ada Produk yang Dipublikasikan"
            description="Daftar sebagai Seller untuk mulai menambahkan produk pertama Anda di FerryMarket."
            action={
              <Link to="/register?role=SELLER" className="btn-primary">
                Daftar Sebagai Seller
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
