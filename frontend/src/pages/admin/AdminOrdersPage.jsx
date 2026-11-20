import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, StatusBadge, Pagination } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';

export default function AdminOrdersPage({ title = 'Kelola Pesanan Marketplace' }) {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/orders', { params: { q: q || undefined, status, page, limit: 20 } });
      setOrders(res.data.data.items || []);
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, status, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">{title}</h2>
        <p className="text-sm text-slate-500">Pantau seluruh transaksi pesanan lintas seller di FerryMarket.</p>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nomor pesanan atau nama pembeli..."
            className="input-field pl-9 py-2"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="input-field w-auto py-2 text-xs"
        >
          <option value="ALL">Semua Status</option>
          <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
          <option value="WAITING_VERIFICATION">WAITING_VERIFICATION</option>
          <option value="PAID">PAID</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="SHIPPED">SHIPPED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <EmptyState title="Belum Ada Pesanan" description="Belum ada transaksi pesanan pada filter ini." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Order Number</th>
                  <th className="px-5 py-3">Pembeli</th>
                  <th className="px-5 py-3">Seller Terlibat</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status Order</th>
                  <th className="px-5 py-3">Pembayaran</th>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-navy-900">{o.orderNumber}</td>
                    <td className="px-5 py-3 text-xs">
                      <p className="font-semibold">{o.buyer?.fullName}</p>
                      <p className="text-slate-500">{o.buyer?.email}</p>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {o.sellerOrders?.map((so) => so.seller?.storeName).join(', ')}
                    </td>
                    <td className="px-5 py-3 font-bold text-primary-600">{formatIDR(o.grandTotal)}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3">
                      {o.payment ? <StatusBadge status={o.payment.status} /> : '-'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(o.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/orders/${o.id}`} className="btn-outline px-2.5 py-1 text-xs">
                        <Eye className="h-3.5 w-3.5" /> Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-4">
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
