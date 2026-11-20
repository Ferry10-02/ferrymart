import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import Logo from '../../components/common/Logo';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setResult(res.data);
      toast.success('Permintaan reset password diproses.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-5 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-xl font-bold text-navy-900">Lupa Password</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Masukkan email terdaftar Anda untuk membuat tautan reset password.
        </p>

        {result ? (
          <div className="mt-6 space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p>{result.message}</p>
            {result.devResetToken && (
              <div className="rounded-lg bg-white p-3 text-xs text-slate-700">
                <p className="font-semibold text-navy-900">Mode Development — Tautan Reset:</p>
                <Link
                  to={`/reset-password?token=${result.devResetToken}`}
                  className="mt-1 inline-block font-semibold text-primary-600 underline"
                >
                  Klik di sini untuk Reset Password
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="input-field pl-10"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Mengirim...' : 'Kirim Permintaan Reset'}
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
