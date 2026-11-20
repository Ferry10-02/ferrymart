import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Store, Minus, Plus, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { LoadingState, EmptyState } from '../../components/common/UIStates';
import { formatIDR } from '../../utils/format';

export default function CartPage() {
  const { cart, loading, updateCartItem, removeCartItem } = useCart();
  const navigate = useNavigate();

  if (loading && !cart?.groups?.length) return <LoadingState message="Memuat keranjang belanja..." />;

  const groups = cart?.groups || [];
  const summary = cart?.summary || { selectedCount: 0, selectedSubtotal: 0, totalItems: 0 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-extrabold text-navy-900">Keranjang Belanja</h1>

      {groups.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Keranjang Belanja Anda Kosong"
          description="Yuk jelajahi berbagai produk menarik dari seller terpercaya di FerryMarket!"
          action={
            <Link to="/products" className="btn-primary">
              Mulai Belanja
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            {groups.map((group) => (
              <div key={group.seller.id} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <Link
                    to={`/store/${group.seller.storeSlug}`}
                    className="flex items-center gap-2 text-sm font-bold text-navy-900 hover:text-primary-600"
                  >
                    <Store className="h-4 w-4 text-primary-500" /> {group.seller.storeName}
                  </Link>
                  <span className="text-xs text-slate-500">{group.seller.city || 'Indonesia'}</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                      <input
                        type="checkbox"
                        checked={item.isSelected}
                        onChange={(e) => updateCartItem(item.id, { isSelected: e.target.checked })}
                        className="h-4 w-4 rounded accent-primary-500"
                      />
                      <img
                        src={
                          item.product.imageUrl ||
                          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80'
                        }
                        alt={item.product.name}
                        className="h-20 w-20 rounded-xl border border-slate-200 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/products/${item.product.slug}`}
                          className="line-clamp-2 text-sm font-semibold text-navy-900 hover:text-primary-600"
                        >
                          {item.product.name}
                        </Link>
                        {item.variant && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            Variasi: {item.variant.name} - {item.variant.value}
                          </p>
                        )}
                        <p className="mt-1 text-sm font-bold text-primary-600">
                          {formatIDR(item.unitPrice)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center rounded-lg border border-slate-300">
                          <button
                            type="button"
                            disabled={item.quantity <= 1}
                            onClick={() => updateCartItem(item.id, { quantity: item.quantity - 1 })}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-9 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            disabled={item.quantity >= item.availableStock}
                            onClick={() => updateCartItem(item.id, { quantity: item.quantity + 1 })}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.id)}
                          title="Hapus"
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Box */}
          <div className="lg:col-span-4">
            <div className="card sticky top-24 p-6">
              <h2 className="text-base font-bold text-navy-900">Ringkasan Belanja</h2>
              <div className="mt-4 space-y-2 border-b border-slate-100 pb-4 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Total Item Dipilih</span>
                  <span className="font-semibold text-navy-900">{summary.selectedCount} barang</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="text-lg font-extrabold text-primary-600">
                    {formatIDR(summary.selectedSubtotal)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Jika Anda checkout dari beberapa seller sekaligus, FerryMarket otomatis memisahkan pesanan berdasarkan masing-masing seller.
              </p>
              <button
                type="button"
                disabled={summary.selectedCount === 0}
                onClick={() => navigate('/checkout')}
                className="btn-primary mt-5 w-full py-3"
              >
                Lanjut ke Checkout <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
