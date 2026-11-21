import { Link } from 'react-router-dom';
import { Star, MapPin, Zap, BadgeCheck } from 'lucide-react';
import { formatIDR, getEffectivePrice, getDiscountPercent } from '../../utils/format';

export default function ProductCard({ product }) {
  const imageUrl =
    product.images?.[0]?.imageUrl ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
  const effectivePrice = getEffectivePrice(product);
  const discount = getDiscountPercent(product);
  const originalPrice = Number(product.compareAtPrice || product.price || 0);

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isFlashSale && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-600 to-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              <Zap className="h-3 w-3 fill-white" /> Flash Sale
            </span>
          )}
          {discount > 0 && (
            <span className="inline-flex w-fit rounded-md bg-primary-500 px-1.5 py-0.5 text-[11px] font-bold text-white shadow">
              -{discount}%
            </span>
          )}
        </div>
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-950/55">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-navy-900">
              Stok Habis
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-slate-800 group-hover:text-primary-600">
          {product.name}
        </h3>

        <div className="mt-2">
          <p className="text-base font-extrabold text-primary-600">{formatIDR(effectivePrice)}</p>
          {discount > 0 && (
            <p className="text-xs text-slate-400 line-through">{formatIDR(originalPrice)}</p>
          )}
        </div>

        <div className="mt-auto pt-2.5">
          {product.isFlashSale && (
            <div className="mb-2">
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-orange-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#EE4D2D]"
                  style={{
                    width: `${Math.min(
                      95,
                      Math.max(
                        18,
                        Math.round(
                          ((Number(product.soldCount || 0) + 3) /
                            Math.max(1, Number(product.soldCount || 0) + Number(product.stock || 0) + 3)) *
                            100
                        )
                      )
                    )}%`,
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold uppercase tracking-wide text-white drop-shadow-xs">
                  {product.stock <= 5 ? 'Segera Habis!' : `${product.soldCount || 0} Terjual`}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-slate-700">
                {Number(product.ratingAvg || 0).toFixed(1)}
              </span>
            </span>
            <span>{product.soldCount || 0} terjual</span>
          </div>

          {product.seller && (
            <div className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
              {product.seller.verificationStatus === 'VERIFIED' ? (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary-500" />
              ) : (
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
              )}
              <span className="truncate">
                {product.seller.city || product.seller.storeName}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
