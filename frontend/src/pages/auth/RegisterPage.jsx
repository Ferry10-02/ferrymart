import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Store, Mail, Lock, Phone, MapPin } from 'lucide-react';
import Logo from '../../components/common/Logo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'SELLER' ? 'SELLER' : 'BUYER';

  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeCity: '',
    storeProvince: '',
    storeDescription: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Konfirmasi password tidak cocok.');
    }
    if (form.password.length < 8) {
      return toast.error('Password minimal 8 karakter.');
    }
    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role,
        ...(role === 'SELLER'
          ? {
              storeName: form.storeName,
              storeCity: form.storeCity,
              storeProvince: form.storeProvince,
              storeDescription: form.storeDescription,
            }
          : {}),
      };
      const { message } = await register(payload);
      toast.success(message);
      navigate(role === 'SELLER' ? '/seller' : '/', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-5 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-2xl font-extrabold text-navy-900">Daftar Akun FerryMarket</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Pilih jenis akun yang sesuai dengan kebutuhan Anda.
        </p>

        {/* Role Selector */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('BUYER')}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-bold transition ${
              role === 'BUYER'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User className="h-4 w-4" /> Pembeli (Buyer)
          </button>
          <button
            type="button"
            onClick={() => setRole('SELLER')}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-bold transition ${
              role === 'SELLER'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Store className="h-4 w-4" /> Penjual (Seller)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Lengkap</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Nama lengkap Anda"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@anda.com"
                  className="input-field pl-9"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">No. WhatsApp / HP</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0812xxxxxxxx"
                  className="input-field pl-9"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 karakter"
                  className="input-field pl-9"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Konfirmasi Password</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Ulangi password"
                className="input-field"
              />
            </div>
          </div>

          {role === 'SELLER' && (
            <div className="mt-2 space-y-3 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-700">
                <Store className="h-4 w-4" /> Informasi Toko Seller
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Toko *</label>
                <input
                  type="text"
                  required
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  placeholder="Contoh: Ferry Elektronik Official"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Kota</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.storeCity}
                      onChange={(e) => setForm({ ...form, storeCity: e.target.value })}
                      placeholder="Jakarta Selatan"
                      className="input-field pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Provinsi</label>
                  <input
                    type="text"
                    value={form.storeProvince}
                    onChange={(e) => setForm({ ...form, storeProvince: e.target.value })}
                    placeholder="DKI Jakarta"
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Deskripsi Singkat Toko</label>
                <textarea
                  rows={2}
                  value={form.storeDescription}
                  onChange={(e) => setForm({ ...form, storeDescription: e.target.value })}
                  placeholder="Ceritakan produk unggulan toko Anda..."
                  className="input-field"
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? 'Mendaftarkan...' : role === 'SELLER' ? 'Daftar & Buka Toko' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
