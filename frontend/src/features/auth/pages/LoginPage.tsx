import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { FormField } from '../../../shared/components/FormField';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  User,
  Users,
  Briefcase,
  GraduationCap,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      await login({ email, password });
    } catch (err: any) {
      if (err.response?.data) {
        setErrorMsg(err.response.data.message || 'Login failed');
        if (err.response.data.errors) {
          const map: Record<string, string> = {};
          err.response.data.errors.forEach((fe: any) => {
            map[fe.field] = fe.message;
          });
          setFieldErrors(map);
        }
      } else {
        setErrorMsg('Network error. Unable to reach server.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/25 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-500/30 mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Qynova ERP</h1>
          <p className="text-sm text-slate-400 mt-1">Enterprise Resource Planning Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Sign in to your account</h2>
          <p className="text-xs text-slate-500 mb-6">Enter your organizational credentials to continue</p>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email Address" error={fieldErrors['email']} required>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@qynova.erp"
                required
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </FormField>

            <FormField label="Password" error={fieldErrors['password']} required>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Locked out after 5 attempts</span>
              <Link
                to="/forgot-password"
                className="text-indigo-600 hover:text-indigo-800 font-semibold transition"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher for fast evaluation */}
          {(import.meta as any).env?.DEV !== false && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
                Quick Test Credentials
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@qynova.erp', 'Admin@123')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 flex flex-col items-center gap-1 text-slate-700 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold">Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('hr@qynova.erp', 'Hr@123')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 flex flex-col items-center gap-1 text-slate-700 transition"
                >
                  <Users className="w-4 h-4 text-pink-600" />
                  <span className="font-bold">HR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('manager@qynova.erp', 'Manager@123')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 flex flex-col items-center gap-1 text-slate-700 transition"
                >
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span className="font-bold">Manager</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('employee@qynova.erp', 'Employee@123')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 flex flex-col items-center gap-1 text-slate-700 transition"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">Employee</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('intern@qynova.erp', 'Intern@123')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 flex flex-col items-center gap-1 text-slate-700 transition col-span-2 sm:col-span-1"
                >
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span className="font-bold">Intern</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
