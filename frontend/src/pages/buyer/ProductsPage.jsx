import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Search, RotateCcw } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import ProductCard from '../../components/marketplace/ProductCard';
import { LoadingState, EmptyState, ErrorState, Pagination } from '../../components/common/UIStates';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    flashSale: searchParams.get('flash_sale') === 'true',
    discounted: searchParams.get('discounted') === 'true',
    sort: searchParams.get('sort') || 'recommended',
    page: parseInt(searchParams.get('page') || '1', 10),
  });

  useEffect(() => {
    setFilters({
      q: searchParams.get('q') || '',
      category: searchParams.get('category') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      flashSale: searchParams.get('flash_sale') === 'true',
      discounted: searchParams.get('discounted') === 'true',
      sort: searchParams.get('sort') || 'recommended',
      page: parseInt(searchParams.get('page') || '1', 10),
    });
  }, [searchParams]);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.data.data || []))
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: filters.page,
        limit: 20,
        sort: filters.sort,
      };
      if (filters.q) params.q = filters.q;
      if (filters.category) params.category = filters.category;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.flashSale) params.flashSale = 'true';
      if (filters.discounted) params.discounted = 'true';

      const res = await api.get('/products', { params });
      setProducts(res.data.data.items || []);
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const applyFilter = (next) => {
    const merged = { ...filters, ...next, page: next.page || 1 };
    const sp = new URLSearchParams();
    if (merged.q) sp.set('q', merged.q);
    if (merged.category) sp.set('category', merged.category);
    if (merged.minPrice) sp.set('minPrice', merged.minPrice);
    if (merged.maxPrice) sp.set('maxPrice', merged.maxPrice);
    if (merged.flashSale) sp.set('flash_sale', 'true');
    if (merged.discounted) sp.set('discounted', 'true');
    if (merged.sort && merged.sort !== 'recommended') sp.set('sort', merged.sort);
    if (merged.page > 1) sp.set('page', String(merged.page));
    setSearchParams(sp);
  };

  const resetFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3">
          <div className="card space-y-5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
                <SlidersHorizontal className="h-4 w-4 text-primary-500" /> Filter Produk
              </h2>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary-600"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Kata Kunci</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilter({ q: filters.q })}
                  placeholder="Cari produk..."
                  className="input-field pl-9 py-2"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Kategori</label>
              <select
                value={filters.category}
                onChange={(e) => applyFilter({ category: e.target.value })}
                className="input-field py-2"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Rentang Harga (Rp)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  placeholder="Min"
                  className="input-field py-2"
                />
                <input
                  type="number"
                  min={0}
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="Max"
                  className="input-field py-2"
                />
              </div>
              <button
                type="button"
                onClick={() => applyFilter({ minPrice: filters.minPrice, maxPrice: filters.maxPrice })}
                className="btn-navy mt-2.5 w-full py-2 text-xs"
              >
                Terapkan Filter
              </button>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={filters.flashSale}
                  onChange={(e) => applyFilter({ flashSale: e.target.checked })}
                  className="h-4 w-4 rounded accent-primary-500"
                />
                Hanya Flash Sale
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={filters.discounted}
                  onChange={(e) => applyFilter({ discounted: e.target.checked })}
                  className="h-4 w-4 rounded accent-primary-500"
                />
                Sedang Diskon
              </label>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="lg:col-span-9">
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm text-slate-600">
              Menampilkan <span className="font-bold text-navy-900">{pagination.total}</span> produk
              {filters.q ? ` untuk "${filters.q}"` : ''}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Urutkan:</span>
              <select
                value={filters.sort}
                onChange={(e) => applyFilter({ sort: e.target.value })}
                className="input-field w-auto py-1.5 text-xs"
              >
                <option value="recommended">Rekomendasi</option>
                <option value="newest">Terbaru</option>
                <option value="bestselling">Terlaris</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="price_desc">Harga Tertinggi</option>
                <option value="rating">Rating Tertinggi</option>
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={loadProducts} />
          ) : products.length === 0 ? (
            <EmptyState
              title="Produk Tidak Ditemukan"
              description="Coba ubah kata kunci pencarian atau reset filter untuk melihat produk lainnya."
              action={
                <button type="button" onClick={resetFilters} className="btn-primary">
                  Reset Filter
                </button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(nextPage) => applyFilter({ page: nextPage })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
