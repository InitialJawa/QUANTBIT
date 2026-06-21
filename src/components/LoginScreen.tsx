import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Bug } from 'lucide-react';

export function LoginScreen() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = async () => {
    setLoading(true);
    setError(null);
    try {
      await login('demo@quantbit.local', 'demo123');
    } catch {
      setError('Demo mode gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ backgroundColor: '#0d0d0d', color: '#ffffff' }}>
      <div className="max-w-md w-full border border-white/[0.06] rounded-lg p-8 sm:p-10" style={{ backgroundColor: '#1e222d' }}>
        <div className="mb-8 flex flex-col items-center text-center w-full">
          <svg viewBox="0 0 115 100" className="w-16 h-16 mb-4" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="45" r="28" stroke="#d1d4dc" strokeWidth="16" />
            <path d="M 61 58 L 81 78" stroke="#d1d4dc" strokeWidth="16" strokeLinecap="square" />
            <circle cx="98" cy="70" r="10" fill="#089981" />
          </svg>
          <h1 className="text-xl font-bold tracking-wider text-[#d1d4dc]">
            QUANT<span className="text-[#089981]">BIT</span>
          </h1>
          <p className="text-xs text-[#787b86] mt-2">{isLogin ? 'Sign in to continue' : 'Create an account'}</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded text-sm" style={{ backgroundColor: 'rgba(242,54,69,0.1)', border: '1px solid rgba(242,54,69,0.2)', color: '#f23645' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#787b86] text-xs font-medium mb-1.5">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="w-4 h-4" style={{ color: '#7a7a7a' }} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded py-2.5 pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-[#5d6080]"
                style={{ backgroundColor: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}
                placeholder="name@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-[#787b86] text-xs font-medium mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-4 h-4" style={{ color: '#7a7a7a' }} />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded py-2.5 pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-[#5d6080]"
                style={{ backgroundColor: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded py-2.5 text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#089981', color: '#fff' }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Sign up')}
          </button>

          <button
            type="button"
            onClick={handleDemoMode}
            disabled={loading}
            className="w-full rounded py-2.5 text-xs transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#b0b0b0', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Bug className="w-3.5 h-3.5 inline mr-1.5" />Demo Mode (Offline)
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-xs text-[#787b86]">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="font-medium transition-colors hover:underline"
              style={{ color: '#089981' }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
