import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquareReply, Send, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, Pagination } from '../../components/common/UIStates';
import { formatDate } from '../../utils/format';

export default function SellerReviewsPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    unrepliedCount: 0,
    repliedCount: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [replyDrafts, setReplyDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reviews/seller', { params: { filter, page, limit: 15 } });
      setReviews(res.data.data.items || []);
      setSummary(res.data.data.summary || {});
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter, page, toast]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleReply = async (reviewId) => {
    const text = (replyDrafts[reviewId] || '').trim();
    if (text.length < 2) {
      return toast.error('Balasan minimal 2 karakter.');
    }
    setSubmittingId(reviewId);
    try {
      const res = await api.put(`/reviews/${reviewId}/reply`, { sellerReply: text });
      toast.success(res.data.message);
      setReplyDrafts((prev) => ({ ...prev, [reviewId]: '' }));
      loadReviews();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Ulasan & Rating Pembeli</h2>
        <p className="text-sm text-slate-500">
          Pantau penilaian bintang dari pembeli dan balas ulasan untuk meningkatkan kepercayaan toko Anda.
        </p>
      </div>

      {/* Rating Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="card flex flex-col items-center justify-center p-6 text-center md:col-span-4">
          <div className="flex items-center gap-2">
            <Star className="h-9 w-9 fill-amber-400 text-amber-400" />
            <span className="text-4xl font-extrabold text-navy-900">
              {Number(summary.averageRating || 0).toFixed(1)}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Dari total {summary.totalReviews || 0} ulasan pembeli
          </p>
          <div className="mt-4 flex gap-3 text-xs">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-bold text-amber-800">
              Belum Dibalas: {summary.unrepliedCount || 0}
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-700">
              Dibalas: {summary.repliedCount || 0}
            </span>
          </div>
        </div>

        <div className="card flex flex-col justify-center space-y-2 p-6 md:col-span-8">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.breakdown?.[star] || 0;
            const pct = summary.totalReviews > 0 ? Math.round((count / summary.totalReviews) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="flex w-10 items-center gap-1 font-bold text-navy-900">
                  {star} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-10 text-right font-semibold text-slate-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL', label: `Semua (${summary.totalReviews || 0})` },
          { key: 'UNREPLIED', label: `Perlu Dibalas (${summary.unrepliedCount || 0})` },
          { key: 'REPLIED', label: `Sudah Dibalas (${summary.repliedCount || 0})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setFilter(t.key);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === t.key
                ? 'bg-primary-500 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Belum Ada Ulasan"
          description="Ulasan pembeli akan muncul di sini setelah pembeli menyelesaikan pesanan dan memberi penilaian."
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="card p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      rev.product?.images?.[0]?.imageUrl ||
                      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80'
                    }
                    alt={rev.product?.name}
                    className="h-12 w-12 rounded-lg border object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold text-navy-900">{rev.product?.name}</p>
                    <p className="text-xs text-slate-500">
                      Oleh <strong className="text-slate-700">{rev.buyer?.fullName}</strong> •{' '}
                      {formatDate(rev.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                    />
                  ))}
                </div>
              </div>

              <p className="rounded-xl bg-slate-50 p-3.5 text-sm text-slate-700">
                {rev.comment || <span className="italic text-slate-400">(Pembeli tidak menulis komentar)</span>}
              </p>

              {rev.sellerReply ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs">
                  <p className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Balasan Toko Anda
                    {rev.sellerRepliedAt && (
                      <span className="font-normal text-emerald-600">• {formatDate(rev.sellerRepliedAt)}</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-emerald-950">{rev.sellerReply}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <MessageSquareReply className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={replyDrafts[rev.id] || ''}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [rev.id]: e.target.value }))}
                      placeholder="Tulis balasan ramah untuk pembeli ini..."
                      className="input-field pl-9 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={submittingId === rev.id}
                    onClick={() => handleReply(rev.id)}
                    className="btn-primary px-4 py-2 text-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submittingId === rev.id ? 'Mengirim...' : 'Kirim Balasan'}
                  </button>
                </div>
              )}
            </div>
          ))}
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
