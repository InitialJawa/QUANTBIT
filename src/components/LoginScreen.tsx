import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock } from 'lucide-react';

export function LoginScreen() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-[#121212] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center w-full">
          <div className="relative flex items-center justify-center mb-4">
            <svg viewBox="0 0 115 100" className="w-20 h-20 text-white transition-colors duration-300 dark:text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="48" cy="45" r="28" stroke="currentColor" strokeWidth="16" />
              <path d="M 61 58 L 81 78" stroke="currentColor" strokeWidth="16" strokeLinecap="square" />
              <circle cx="98" cy="70" r="10" className="fill-emerald-400" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-[0.2em] text-white">
            QUANT<span className="text-emerald-400 font-medium">BIT</span>
          </h1>
          <p className="text-sm text-white/50 mt-2">{isLogin ? 'Sign in' : 'Create account'}</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-white/40" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-white/20"
                placeholder="nama@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-white/40" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-white/20"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-gray-200 disabled:opacity-50 text-black font-semibold py-3.5 rounded-xl transition-all mt-6"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Sign up')}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-start gap-1">
          <p className="text-sm text-white/50">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-white font-medium hover:text-emerald-400 transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
