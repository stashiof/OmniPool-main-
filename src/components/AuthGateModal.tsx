import React, { useState } from 'react';
import {
  Smartphone,
  Lock,
  UserPlus,
  LogIn,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Database,
  Copy,
  LogOut,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { useOmniPool } from '../context/OmniPoolContext';
import { resolveSupabaseConfig, SUPABASE_SQL_SCHEMA } from '../utils/cloudSync';
import { loadGlobalSupabaseConfig, saveGlobalSupabaseConfig } from '../utils/storageDb';

export const FullScreenAuthGate: React.FC = () => {
  const { tenants, loginOrRegisterTenant, showToast, toast } = useOmniPool();

  const initialSb = loadGlobalSupabaseConfig();
  const [authMode, setAuthMode] = useState<'register' | 'login'>(
    tenants.length > 0 ? 'login' : 'register'
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState(initialSb.supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialSb.supabaseAnonKey);
  const [showDbSetup, setShowDbSetup] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSupabaseConfigured = Boolean(
    resolveSupabaseConfig(supabaseUrl, supabaseAnonKey)
  );

  const handleCopySql = () => {
    navigator.clipboard?.writeText(SUPABASE_SQL_SCHEMA).catch(() => {});
    setCopiedSql(true);
    showToast('Supabase SQL Schema ক্লিপবোর্ডে কপি হয়েছে!', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    if (supabaseUrl.trim() || supabaseAnonKey.trim()) {
      saveGlobalSupabaseConfig({
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
      });
    }

    const res = await loginOrRegisterTenant({
      phoneNumber,
      password,
      displayName,
      authMode,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
    });
    setIsSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Authentication failed.');
      return;
    }
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <span className="text-xl font-bold tracking-tight text-emerald-400 font-display">
            OmniPool
          </span>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            · Multi-Account Cloud Storage Pool &amp; Unified Mail Hub
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowSqlModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          Supabase SQL Schema
        </button>
      </header>

      {/* Main Content Split */}
      <main className="max-w-5xl w-full mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left 6 Cols: Onboarding Guide & Architecture Info */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>ZERO-DUMMY PRODUCTION CLOUD VAULT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 leading-tight">
              আপনার মোবাইল নম্বর দিয়ে নিজস্ব ক্লাউড স্টোরেজ পুল তৈরি করুন
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              একই অ্যাকাউন্টের আন্ডারে আপনার যত খুশি (২০+, ৫০+ বা আনলিমিটেড) Gmail যুক্ত করুন, প্রতিটি অ্যাকাউন্টের ১৫ জিবি ফ্রি ড্রাইভ একত্রিত করে বিশাল ভার্চুয়াল ড্রাইভ তৈরি করুন এবং যেকোনো ডিভাইস থেকে মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে লগইন করে সব ডাটা ফিরে পান।
            </p>
          </div>

          {/* 3-Step Workflow Guide */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-100">
              কিভাবে শুরু করবেন (৩টি সহজ ধাপ):
            </h2>
            <ol className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="font-mono font-bold text-emerald-400 shrink-0">01.</span>
                <div>
                  <strong className="text-slate-100">Supabase SQL সেটআপ (ঐচ্ছিক কিন্তু ক্লাউড সিঙ্কের জন্য আবশ্যক):</strong>{' '}
                  উপরের <button type="button" onClick={() => setShowSqlModal(true)} className="text-cyan-400 underline cursor-pointer">Supabase SQL Schema</button> বাটনে ক্লিক করে কোডটি কপি করুন এবং আপনার Supabase SQL Editor-এ Run করুন।
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-mono font-bold text-emerald-400 shrink-0">02.</span>
                <div>
                  <strong className="text-slate-100">মোবাইল নম্বর দিয়ে অ্যাকাউন্ট তৈরি:</strong>{' '}
                  ডানপাশের ফর্মে আপনার মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে অ্যাকাউন্ট খুলুন। আপনার জন্য একটি স্বতন্ত্র <code className="text-emerald-400 font-mono">user_id</code> তৈরি হবে।
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-mono font-bold text-emerald-400 shrink-0">03.</span>
                <div>
                  <strong className="text-slate-100">Gmail যুক্ত ও ফাইল আপলোড:</strong>{' '}
                  লগইন করার পর <strong className="text-emerald-300">+ Add Gmail Node</strong> বাটনে ক্লিক করে আপনার আসল Gmail গুলো যুক্ত করুন এবং ফাইল আপলোড করুন—সবকিছু আপনার অ্যাকাউন্টের আন্ডারে ডাটাবেজে সেভ থাকবে।
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Right 6 Cols: Mobile Number + Password Registration / Login Form */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl">
          {toast && (
            <div className="px-3.5 py-2.5 rounded-lg border border-emerald-500/40 bg-slate-950 text-xs font-mono text-emerald-300">
              {toast.message}
            </div>
          )}

          {/* Mode Toggle: Register vs Login */}
          <div
            role="group"
            aria-label="Authentication Mode"
            className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl"
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              নতুন অ্যাকাউন্ট (Register)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              লগইন করুন (Login)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="gate-phone-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                মোবাইল নম্বর (Mobile Number)
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="gate-phone-input"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="017XXXXXXXX অথবা +88017XXXXXXXX"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label
                  htmlFor="gate-display-name"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  আপনার নাম বা ভল্টের নাম (ঐচ্ছিক)
                </label>
                <input
                  id="gate-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="যেমন: Personal Cloud Pool"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="gate-password-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                পাসওয়ার্ড (Password — কমপক্ষে ৪ অক্ষর)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="gate-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="আপনার গোপন পাসওয়ার্ড দিন"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Optional Expandable Supabase Connection Panel */}
            <div className="border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDbSetup(!showDbSetup)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-slate-100 cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Supabase Cloud Database সংযোগ{' '}
                    {isSupabaseConfigured ? (
                      <span className="text-emerald-400 font-mono">(Connected)</span>
                    ) : (
                      <span className="text-slate-500 font-mono">(ঐচ্ছিক / পরেও দেওয়া যাবে)</span>
                    )}
                  </span>
                </span>
                {showDbSetup ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showDbSetup && (
                <div className="p-3.5 pt-1 border-t border-slate-800/80 space-y-3">
                  <div>
                    <label
                      htmlFor="gate-supabase-url"
                      className="block text-[11px] font-mono text-slate-400 mb-1"
                    >
                      Supabase Project URL
                    </label>
                    <input
                      id="gate-supabase-url"
                      type="url"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="gate-supabase-key"
                      className="block text-[11px] font-mono text-slate-400 mb-1"
                    >
                      Supabase Anon / Public Key
                    </label>
                    <input
                      id="gate-supabase-key"
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    এখানে অথবা লগইন করার পর <strong className="text-slate-200">Cloud DB &amp; APK</strong> ট্যাবে গিয়ে Supabase URL ও Anon Key বসালেই আপনার সকল ডাটা সরাসরি অনলাইনে সেভ হবে।
                  </p>
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium bg-rose-950/30 border border-rose-500/30 rounded-lg p-2.5">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : authMode === 'register' ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {authMode === 'register'
                ? 'অ্যাকাউন্ট তৈরি করুন (Create Account & Open Vault)'
                : 'লগইন করুন (Login & Restore Vault)'}
            </button>
          </form>

          {/* Previously registered accounts on this device */}
          {tenants.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-xs text-slate-400">
                এই ডিভাইসে সেভ থাকা অ্যাকাউন্টসমূহ (ক্লিক করে নম্বর বসান):
              </div>
              <div className="flex flex-wrap gap-2">
                {tenants.map((t) => (
                  <button
                    key={t.userId}
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setPhoneNumber(t.phoneNumber);
                      setErrorMsg(null);
                    }}
                    className="px-2.5 py-1 text-xs font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-cyan-300 cursor-pointer"
                  >
                    {t.phoneNumber}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto py-3 border-t border-slate-900 flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono">
        <span>OmniPool Multi-Tenant Cloud SaaS · Zero Dummy Data</span>
        <span>Supabase PostgreSQL + IndexedDB Encrypted Cache</span>
      </footer>

      {/* SQL Schema Modal on Auth Screen */}
      {showSqlModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-sql-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 id="auth-sql-modal-title" className="text-base font-bold text-slate-100">
                  Supabase PostgreSQL Database SQL Schema
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supabase Dashboard &rarr; SQL Editor &rarr; New Query তে এই কোডটি পেস্ট করে &quot;Run&quot; বাটনে ক্লিক করুন
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedSql ? 'Copied!' : 'Copy SQL Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-auto flex-1 leading-relaxed">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export const AuthGateModal: React.FC = () => {
  const {
    currentUser,
    tenants,
    cloudSyncStatus,
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginOrRegisterTenant,
    logoutTenant,
    switchTenantQuick,
    forceCloudBackupNow,
    forceCloudRestoreNow,
  } = useOmniPool();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await loginOrRegisterTenant({
      phoneNumber,
      password,
      displayName,
      authMode,
    });
    setIsSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Authentication failed.');
      return;
    }
    setPhoneNumber('');
    setPassword('');
    setIsAuthModalOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2
              id="auth-gate-modal-title"
              className="text-lg font-bold text-slate-100"
            >
              অ্যাকাউন্ট ও ক্লাউড সিঙ্ক ম্যানেজার
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Mobile Number + Password cloud sync · Isolated <code className="text-emerald-400 font-mono">user_id</code>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/70 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Active Session Status Bar */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs text-slate-400">সক্রিয় অ্যাকাউন্ট (Logged-In)</div>
              <div className="text-sm font-mono font-semibold text-emerald-400">
                {currentUser.phoneNumber}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                ID: {currentUser.userId}
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-300">
                <Cloud className="w-3.5 h-3.5" />
                {cloudSyncStatus}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => forceCloudBackupNow()}
                  className="px-2.5 py-1 text-[11px] font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-md cursor-pointer"
                >
                  Backup to Cloud
                </button>
                <button
                  type="button"
                  onClick={() => forceCloudRestoreNow()}
                  className="px-2.5 py-1 text-[11px] font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-md cursor-pointer"
                >
                  Restore Vault
                </button>
                <button
                  type="button"
                  onClick={() => logoutTenant()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-md cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tenant Switcher */}
        {tenants.length > 1 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-300">
              ডিভাইসে লগইনকৃত অন্য অ্যাকাউন্টে সুইচ করুন ({tenants.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tenants.map((t) => {
                const isCurrent = t.userId === currentUser.userId;
                return (
                  <button
                    key={t.userId}
                    type="button"
                    onClick={async () => {
                      await switchTenantQuick(t.userId);
                      setIsAuthModalOpen(false);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-semibold truncate">
                        {t.phoneNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {t.displayName}
                      </div>
                    </div>
                    {isCurrent && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode Segmented Toggle: Login vs Register Another Mobile Number */}
        <div
          role="group"
          aria-label="Authentication Mode"
          className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl"
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'login'
                ? 'bg-slate-800 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            অন্য অ্যাকাউন্টে লগইন
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'register'
                ? 'bg-slate-800 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            নতুন নম্বর রেজিস্টার
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="auth-phone-input"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              মোবাইল নম্বর (e.g., 017XXXXXXXX)
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-phone-input"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {authMode === 'register' && (
            <div>
              <label
                htmlFor="auth-display-name"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                ভল্টের নাম / মালিকের নাম (ঐচ্ছিক)
              </label>
              <input
                id="auth-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Personal Cloud Vault"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-password-input"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              পাসওয়ার্ড (Password)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
          )}

          <div className="flex items-center justify-end pt-2 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : authMode === 'register' ? (
                <UserPlus className="w-3.5 h-3.5" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              {authMode === 'register'
                ? 'Create Cloud Vault'
                : 'Login & Sync Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
