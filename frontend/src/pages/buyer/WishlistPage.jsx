import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ProductCard from '../../components/marketplace/ProductCard';
import { LoadingState, EmptyState } from '../../components/common/UIStates';

export default function WishlistPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWishlists = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/wishlists');
      setItems(res.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = async (productId) => {
    try {
      await api.post('/users/wishlists/toggle', { productId });
      setItems((prev) => prev.filter((w) => w.productId !== productId));
      toast.info('Produk dihapus dari favorit.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingState message="Memuat daftar favorit..." />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-extrabold text-navy-900">Produk Favorit Saya</h1>
      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Belum Ada Produk Favorit"
          description="Simpan produk yang Anda sukai dengan menekan ikon hati pada halaman detail produk."
          action={
            <Link to="/products" className="btn-primary">
              Cari Produk
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {items.map((w) => (
            <div key={w.id} className="relative">
              <ProductCard product={w.product} />
              <button
                type="button"
                onClick={() => handleRemove(w.productId)}
                title="Hapus dari favorit"
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-500 shadow hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
