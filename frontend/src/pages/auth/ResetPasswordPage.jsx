import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import Logo from '../../components/common/Logo';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('Konfirmasi password tidak cocok.');
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword });
      toast.success(res.data.message);
      navigate('/login');
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
        <h1 className="text-center text-xl font-bold text-navy-900">Atur Password Baru</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Token Reset</label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Tempel token reset Anda"
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Password Baru</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="input-field pl-9"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Konfirmasi Password Baru</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              className="input-field"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">
          <Link to="/login" className="font-semibold text-primary-600 hover:underline">
            Kembali ke halaman Login
          </Link>
        </p>
      </div>
    </div>
  );
}
