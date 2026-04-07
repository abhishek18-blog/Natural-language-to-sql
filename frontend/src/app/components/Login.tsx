import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Database, Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent, isAdmin: boolean = false) => {
    e.preventDefault();
    // Mock login success
    localStorage.setItem('user-role', isAdmin ? 'Admin' : 'User');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-4 selection:bg-indigo-500/30">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
          <p className="text-zinc-400">Sign in to sync your text-to-SQL history</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-zinc-300">Password</label>
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-all border border-zinc-700"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                Sign In as Admin
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm text-zinc-500">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
