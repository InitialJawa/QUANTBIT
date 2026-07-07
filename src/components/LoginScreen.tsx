import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Bug } from '../utils/icons';

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
    <div className="min-h-screen flex items-center justify-center p-4 font-body" style={{ backgroundColor: '#0a0f0c' }}>
      <div className="max-w-md w-full glass-elevated rounded-lg p-8 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center w-full">
          <svg viewBox="0 0 115 100" className="w-16 h-16 mb-4" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="45" r="28" stroke="var(--text-primary)" strokeWidth="16" />
            <path d="M 61 58 L 81 78" stroke="var(--text-primary)" strokeWidth="16" strokeLinecap="square" />
            <circle cx="98" cy="70" r="10" fill="#9FD8BD" />
          </svg>
          <h1 className="text-xl font-bold tracking-wider text-[var(--text-primary)] font-display">
            QUANT<span className="text-emerald-400">BIT</span>
          </h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">{isLogin ? 'Sign in to continue' : 'Create an account'}</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded text-sm bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[var(--text-tertiary)] text-xs font-medium mb-1.5">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded py-2.5 pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-[var(--text-muted)] glass-elevated"
                placeholder="name@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-[var(--text-tertiary)] text-xs font-medium mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded py-2.5 pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-[var(--text-muted)] glass-elevated"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded py-2.5 text-xs font-medium bg-emerald-500 text-[#0a0f0c] transition-opacity disabled:opacity-50 hover:opacity-90"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Sign up')}
          </button>

          <button
            type="button"
            onClick={handleDemoMode}
            disabled={loading}
            className="w-full rounded py-2.5 text-xs transition-colors disabled:opacity-50 glass-surface text-[var(--text-secondary)]"
          >
            <Bug className="w-3.5 h-3.5 inline mr-1.5" />Demo Mode (Offline)
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-xs text-[var(--text-tertiary)]">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-emerald-400 font-medium transition-colors hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
