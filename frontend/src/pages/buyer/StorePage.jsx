import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Store, BadgeCheck, MapPin, Star, MessageSquare, Package } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ProductCard from '../../components/marketplace/ProductCard';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/UIStates';

export default function StorePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/sellers/store/${slug}`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleChatStore = async () => {
    if (!isAuthenticated) {
      return navigate('/login', { state: { from: `/store/${slug}` } });
    }
    try {
      const res = await api.post('/chat/conversations', { sellerId: data.seller.id });
      navigate(`/chat?conversationId=${res.data.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingState message="Memuat halaman toko..." />;
  if (error || !data?.seller) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <ErrorState message={error || 'Toko tidak ditemukan.'} />
      </div>
    );
  }

  const { seller, products } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Store Banner Header */}
      <div className="card overflow-hidden">
        <div className="relative h-44 bg-gradient-to-r from-navy-900 to-navy-800">
          {seller.bannerUrl && (
            <img src={seller.bannerUrl} alt={seller.storeName} className="h-full w-full object-cover opacity-50" />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="-mt-14 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-navy-900 text-white shadow-lg">
              {seller.logoUrl ? (
                <img src={seller.logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <Store className="h-9 w-9 text-primary-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-navy-900">{seller.storeName}</h1>
                {seller.verificationStatus === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-700">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified Seller
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {seller.city || 'Indonesia'}
                  {seller.province ? `, ${seller.province}` : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {Number(seller.ratingAvg || 0).toFixed(1)} ({seller._count?.reviews || 0} ulasan)
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> {seller._count?.products || products.length} Produk
                </span>
              </div>
            </div>
          </div>

          <button type="button" onClick={handleChatStore} className="btn-primary">
            <MessageSquare className="h-4 w-4" /> Chat Penjual
          </button>
        </div>
        {seller.description && (
          <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-600">
            {seller.description}
          </div>
        )}
      </div>

      {/* Store Products */}
      <h2 className="mt-8 mb-4 text-lg font-extrabold text-navy-900">
        Etalase Produk ({products.length})
      </h2>
      {products.length === 0 ? (
        <EmptyState title="Belum Ada Produk" description="Toko ini belum mempublikasikan produk aktif." />
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={{ ...p, seller }} />
          ))}
        </div>
      )}
    </div>
  );
}
