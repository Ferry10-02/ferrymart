import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star,
  Heart,
  ShoppingCart,
  MessageSquare,
  Store,
  QrCode,
  BadgeCheck,
  MapPin,
  Minus,
  Plus,
  Zap,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { LoadingState, ErrorState } from '../../components/common/UIStates';
import ProductCard from '../../components/marketplace/ProductCard';
import QrCodeModal from '../../components/qr/QrCodeModal';
import { formatIDR, formatDate, getEffectivePrice, getDiscountPercent } from '../../utils/format';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isFromQr = searchParams.get('src') === 'qr';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const loadProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/products/${slug}`, {
        params: isFromQr ? { src: 'qr' } : undefined,
      });
      const d = res.data.data;
      setDetail(d);
      setIsWishlisted(Boolean(d.isWishlisted));
      setSelectedImage(0);
      setSelectedVariant(d.product.variants?.[0] || null);
      setQuantity(1);
      if (isFromQr && d.qrScanNotified) {
        toast.success(`QR Produk "${d.product.name}" terverifikasi! Notifikasi scan telah dikirim ke Seller & Admin.`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) return <LoadingState message="Memuat detail produk..." />;
  if (error || !detail?.product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <ErrorState message={error || 'Produk tidak ditemukan.'} onRetry={loadProduct} />
      </div>
    );
  }

  const { product, related, qr } = detail;
  const images =
    product.images?.length > 0
      ? product.images
      : [{ imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80' }];
  const baseEffective = getEffectivePrice(product);
  const finalPrice = baseEffective + Number(selectedVariant?.priceAdjustment || 0);
  const discount = getDiscountPercent(product);
  const activeStock = selectedVariant ? selectedVariant.stock : product.stock;

  const handleAddToCart = async (buyNow = false) => {
    if (!isAuthenticated) {
      toast.info('Silakan login terlebih dahulu untuk berbelanja.');
      return navigate('/login', { state: { from: `/products/${slug}` } });
    }
    const ok = await addToCart(product.id, selectedVariant?.id || null, quantity);
    if (ok && buyNow) {
      navigate('/cart');
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      return navigate('/login', { state: { from: `/products/${slug}` } });
    }
    try {
      const res = await api.post('/users/wishlists/toggle', { productId: product.id });
      setIsWishlisted(res.data.data.isWishlisted);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleChatSeller = async () => {
    if (!isAuthenticated) {
      return navigate('/login', { state: { from: `/products/${slug}` } });
    }
    try {
      const res = await api.post('/chat/conversations', {
        sellerId: product.seller.id,
        productId: product.id,
      });
      navigate(`/chat?conversationId=${res.data.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-primary-600">Beranda</Link>
        <span>/</span>
        <Link to={`/products?category=${product.category?.slug}`} className="hover:text-primary-600">
          {product.category?.name}
        </Link>
        <span>/</span>
        <span className="truncate font-medium text-slate-800">{product.name}</span>
      </nav>

      {/* QR Scan Verified Banner */}
      {isFromQr && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          <QrCode className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold">QR Produk Terverifikasi FerryMarket</p>
            <p className="text-emerald-700">
              Anda membuka halaman ini melalui scan QR Code. Notifikasi scan telah dikirim ke Seller & Admin.
            </p>
          </div>
        </div>
      )}

      {/* Main Product Box */}
      <div className="card grid grid-cols-1 gap-8 p-6 lg:grid-cols-12">
        {/* Image Gallery */}
        <div className="lg:col-span-5">
          <div className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <img
              src={images[selectedImage]?.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={`aspect-square overflow-hidden rounded-lg border-2 ${
                    selectedImage === idx ? 'border-primary-500' : 'border-slate-200'
                  }`}
                >
                  <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Buy Actions */}
        <div className="flex flex-col lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              {product.isFlashSale && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-md bg-orange-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  <Zap className="h-3.5 w-3.5 fill-white" /> FLASH SALE
                </span>
              )}
              <h1 className="text-xl font-extrabold text-navy-900 sm:text-2xl">{product.name}</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                title="QR Code Produk"
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 hover:text-navy-900"
              >
                <QrCode className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleToggleWishlist}
                title="Favorit"
                className={`rounded-xl border p-2.5 transition ${
                  isWishlisted
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500' : ''}`} />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {Number(product.ratingAvg || 0).toFixed(1)} ({product.reviewCount} ulasan)
            </span>
            <span>{product.soldCount} terjual</span>
            <span>Kondisi: {product.condition === 'USED' ? 'Bekas' : 'Baru'}</span>
            <span>Berat: {product.weightGrams}g</span>
          </div>

          {/* Price Box */}
          <div className="mt-5 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-primary-600">
                {formatIDR(finalPrice)}
              </span>
              {discount > 0 && (
                <>
                  <span className="text-sm text-slate-400 line-through">
                    {formatIDR(product.compareAtPrice || product.price)}
                  </span>
                  <span className="rounded-md bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700">
                    Hemat {discount}%
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                Pilih Variasi
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const active = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={v.stock === 0}
                      onClick={() => {
                        setSelectedVariant(v);
                        setQuantity(1);
                      }}
                      className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                        active
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      } disabled:opacity-40`}
                    >
                      {v.name}: {v.value}
                      {Number(v.priceAdjustment) !== 0 && (
                        <span className="ml-1 text-[11px] text-slate-500">
                          ({Number(v.priceAdjustment) > 0 ? '+' : ''}
                          {formatIDR(v.priceAdjustment)})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Stock */}
          <div className="mt-5 flex items-center gap-4">
            <span className="text-xs font-bold uppercase text-slate-600">Jumlah</span>
            <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-sm font-bold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(Math.max(1, activeStock), q + 1))}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className="text-xs text-slate-500">
              Tersisa <span className="font-bold text-slate-800">{activeStock}</span> buah
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={activeStock === 0}
              onClick={() => handleAddToCart(false)}
              className="btn-outline flex-1 border-primary-500 text-primary-600 hover:bg-primary-50 py-3"
            >
              <ShoppingCart className="h-4 w-4" /> Tambah Keranjang
            </button>
            <button
              type="button"
              disabled={activeStock === 0}
              onClick={() => handleAddToCart(true)}
              className="btn-primary flex-1 py-3"
            >
              Beli Sekarang
            </button>
          </div>

          {/* Seller Info Bar */}
          {product.seller && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-white">
                  {product.seller.logoUrl ? (
                    <img
                      src={product.seller.logoUrl}
                      alt={product.seller.storeName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <Store className="h-6 w-6 text-primary-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/store/${product.seller.storeSlug}`}
                      className="font-bold text-navy-900 hover:text-primary-600"
                    >
                      {product.seller.storeName}
                    </Link>
                    {product.seller.verificationStatus === 'VERIFIED' && (
                      <BadgeCheck className="h-4 w-4 text-primary-500" />
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" /> {product.seller.city || 'Indonesia'} • Rating{' '}
                    {Number(product.seller.ratingAvg || 0).toFixed(1)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleChatSeller} className="btn-outline px-3 py-2 text-xs">
                  <MessageSquare className="h-4 w-4 text-primary-500" /> Chat Seller
                </button>
                <Link to={`/store/${product.seller.storeSlug}`} className="btn-navy px-3 py-2 text-xs">
                  Kunjungi Toko
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description & Reviews */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="card p-6 lg:col-span-7">
          <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-navy-900">
            Deskripsi Produk
          </h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {product.description}
          </p>
        </div>

        <div className="card p-6 lg:col-span-5">
          <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-navy-900">
            Ulasan Pembeli ({product.reviewCount})
          </h2>
          {product.reviews?.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Belum ada ulasan untuk produk ini.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {product.reviews.map((rev) => (
                <div key={rev.id} className="border-b border-slate-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy-900">{rev.buyer?.fullName}</p>
                    <span className="text-[11px] text-slate-400">{formatDate(rev.createdAt, false)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${
                          star <= rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  {rev.comment && <p className="mt-2 text-sm text-slate-700">{rev.comment}</p>}
                  {rev.sellerReply && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                      <span className="font-bold text-navy-900">Balasan Seller:</span> {rev.sellerReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {related?.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-extrabold text-navy-900">Produk Terkait</h2>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <QrCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title={`QR Produk: ${product.name}`}
        subtitle="Scan menggunakan kamera HP untuk langsung membuka halaman produk ini di FerryMarket."
        targetUrl={qr?.targetUrl || `${window.location.origin}/products/${product.slug}?src=qr`}
      />
    </div>
  );
}
