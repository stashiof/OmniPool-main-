import React, { useState } from 'react';
import {
  Cpu,
  Key,
  Save,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Sliders,
  Database,
  CloudUpload,
  CloudDownload,
  Copy,
  Smartphone,
} from 'lucide-react';
import { useOmniPool } from '../context/OmniPoolContext';
import {
  GITHUB_ACTIONS_APK_WORKFLOW,
  SUPABASE_SQL_SCHEMA,
} from '../utils/cloudSync';

export const ModulesSettingsView: React.FC = () => {
  const {
    currentUser,
    cloudSyncStatus,
    extensions,
    toggleExtensionModule,
    settings,
    updateSettings,
    setOperationMode,
    connectLiveGoogleOAuthNode,
    forceCloudBackupNow,
    forceCloudRestoreNow,
    resetDemoVault,
    showToast,
  } = useOmniPool();

  const [clientIdInput, setClientIdInput] = useState(settings.googleClientId);
  const [clientSecretInput, setClientSecretInput] = useState(
    settings.googleClientSecret || ''
  );
  const [apiKeyInput, setApiKeyInput] = useState(settings.googleApiKey);
  const [maxChunkInput, setMaxChunkInput] = useState(String(settings.maxChunkSizeGb));
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(
    settings.supabaseUrl || ''
  );
  const [supabaseAnonKeyInput, setSupabaseAnonKeyInput] = useState(
    settings.supabaseAnonKey || ''
  );
  const [oauthStatus, setOauthStatus] = useState<string | null>(null);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<string | null>(null);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'sql' | 'apk'>('sql');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedChunk = Math.max(1, Math.min(15, parseFloat(maxChunkInput) || 10));
    updateSettings({
      googleClientId: clientIdInput.trim(),
      googleClientSecret: clientSecretInput.trim(),
      googleApiKey: apiKeyInput.trim(),
      supabaseUrl: supabaseUrlInput.trim(),
      supabaseAnonKey: supabaseAnonKeyInput.trim(),
      maxChunkSizeGb: parsedChunk,
    });
  };

  const handleTestLiveOAuth = async () => {
    setOauthStatus('Connecting to Google Identity Services...');
    const res = await connectLiveGoogleOAuthNode('Live-OAuth-Node');
    if (!res.ok) {
      setOauthStatus(`Error: ${res.error}`);
      showToast(res.error || 'OAuth test failed.', 'error');
    } else {
      setOauthStatus('Successfully authenticated and synced Drive v3 & Gmail v1.');
    }
  };

  const handleForceCloudBackup = async () => {
    updateSettings({
      supabaseUrl: supabaseUrlInput.trim(),
      supabaseAnonKey: supabaseAnonKeyInput.trim(),
    });
    const res = await forceCloudBackupNow();
    setCloudStatusMsg(res.message);
  };

  const handleForceCloudRestore = async () => {
    updateSettings({
      supabaseUrl: supabaseUrlInput.trim(),
      supabaseAnonKey: supabaseAnonKeyInput.trim(),
    });
    const res = await forceCloudRestoreNow();
    setCloudStatusMsg(res.message);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Cloud Database Sync, Android APK &amp; OAuth 2.0 Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Supabase PostgreSQL multi-tenant sync for <strong className="font-mono text-emerald-400">{currentUser.phoneNumber}</strong> · Permanent OAuth2 refresh tokens · Capacitor Android APK
          </p>
        </div>

        <button
          type="button"
          onClick={() => resetDemoVault()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          Clear Vault Data
        </button>
      </div>

      {/* Section 1: Cloud Database & SQL Schema (Supabase PostgreSQL + Multi-User Sync) */}
      <section
        aria-label="Cloud Database and SQL Schema"
        className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              01. Cloud Database &amp; SQL Schema (Supabase PostgreSQL)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Two-way encrypted cloud sync so your 25+ Gmail nodes, OAuth refresh tokens, and virtual file index restore immediately on any phone or APK reinstall
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 shrink-0">
            Status: {cloudSyncStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 Cols: Supabase URL & Anon Key + Force Backup / Restore */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label
                htmlFor="supabase-url-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Supabase Project URL (<code className="text-cyan-400 font-mono">SUPABASE_URL</code>)
              </label>
              <input
                id="supabase-url-input"
                type="url"
                value={supabaseUrlInput}
                onChange={(e) => setSupabaseUrlInput(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="supabase-anon-key-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Supabase Anon / Public Key (<code className="text-cyan-400 font-mono">SUPABASE_ANON_KEY</code>)
              </label>
              <input
                id="supabase-anon-key-input"
                type="password"
                value={supabaseAnonKeyInput}
                onChange={(e) => setSupabaseAnonKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleForceCloudBackup}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                Force Cloud Backup Now
              </button>

              <button
                type="button"
                onClick={handleForceCloudRestore}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                Restore Vault from Cloud
              </button>
            </div>

            {cloudStatusMsg && (
              <p className="text-xs font-mono text-emerald-300 bg-slate-950 border border-slate-800 rounded-lg p-3">
                {cloudStatusMsg}
              </p>
            )}

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1 text-xs font-mono text-slate-400">
              <div>Active Tenant Phone: {currentUser.phoneNumber}</div>
              <div>Isolated Namespace: {currentUser.userId}</div>
              <div>
                Last Sync:{' '}
                {new Date(settings.lastCloudSyncIso)
                  .toISOString()
                  .replace('T', ' ')
                  .slice(0, 19)}{' '}
                UTC
              </div>
            </div>
          </div>

          {/* Right 7 Cols: One-Click Copyable PostgreSQL Schema & GitHub Actions Android APK Workflow */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="group"
                aria-label="Schema or APK Workflow Viewer"
                className="inline-flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => setActiveSchemaTab('sql')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSchemaTab === 'sql'
                      ? 'bg-slate-800 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  PostgreSQL / Supabase SQL Schema (RLS)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSchemaTab('apk')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                    activeSchemaTab === 'apk'
                      ? 'bg-slate-800 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  GitHub Actions Android APK (.yml)
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const textToCopy =
                    activeSchemaTab === 'sql'
                      ? SUPABASE_SQL_SCHEMA
                      : GITHUB_ACTIONS_APK_WORKFLOW;
                  navigator.clipboard?.writeText(textToCopy).catch(() => {});
                  showToast(
                    activeSchemaTab === 'sql'
                      ? 'Copied PostgreSQL / Supabase RLS SQL Schema to clipboard.'
                      : 'Copied .github/workflows/build-apk.yml workflow to clipboard.',
                    'success'
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {activeSchemaTab === 'sql'
                  ? 'Copy SQL Schema'
                  : 'Copy build-apk.yml'}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto max-h-72 leading-relaxed">
              {activeSchemaTab === 'sql'
                ? SUPABASE_SQL_SCHEMA
                : GITHUB_ACTIONS_APK_WORKFLOW}
            </pre>
          </div>
        </div>
      </section>

      {/* Section 2: Pluggable Extension Modules */}
      <section aria-label="Pluggable Extension Modules" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            02. Future-Proof Plugin &amp; Automation Slots
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Toggle multi-account quota rotators, Gemini API key poolers, and RAID-5 parity engines
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {extensions.map((ext) => (
            <article
              key={ext.id}
              className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-cyan-400">
                      {ext.category} · {ext.metricsLabel}
                    </div>
                    <h3 className="text-base font-semibold text-slate-100 mt-0.5">
                      {ext.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={ext.enabled}
                    aria-label={`Toggle ${ext.name}`}
                    onClick={() => toggleExtensionModule(ext.id)}
                    className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      ext.enabled
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ext.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {ext.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>{ext.configSummary}</span>
                <span className={ext.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                  {ext.enabled ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 3: Live Google API Mode Configuration & Setup Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              03. Live Google Cloud OAuth 2.0 &amp; Permanent Refresh Tokens
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect real Google accounts with Client ID + Client Secret so <code className="text-emerald-400 font-mono">refresh_token</code> auto-renews <code className="text-cyan-400 font-mono">access_token</code> forever
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label
                htmlFor="settings-operation-mode"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Active Runtime Mode
              </label>
              <select
                id="settings-operation-mode"
                value={settings.mode}
                onChange={(e) =>
                  setOperationMode(e.target.value as 'simulation' | 'live')
                }
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              >
                <option value="simulation">
                  Simulation / Demo Mode (25 Pre-Loaded Gmail Nodes)
                </option>
                <option value="live">
                  Live Google API Mode (Google Identity Services OAuth 2.0)
                </option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="google-client-id-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Google OAuth 2.0 Client ID
                </label>
                <input
                  id="google-client-id-input"
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="123456-abc.apps.googleusercontent.com"
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="google-client-secret-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  OAuth 2.0 Client Secret (For Refresh Token)
                </label>
                <input
                  id="google-client-secret-input"
                  type="password"
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  placeholder="GOCSPX-..."
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="google-api-key-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Optional Google API Key
                </label>
                <input
                  id="google-api-key-input"
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="max-chunk-size-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Max RAID Split Chunk Size (GB)
                </label>
                <input
                  id="max-chunk-size-input"
                  type="number"
                  min="1"
                  max="15"
                  step="0.5"
                  value={maxChunkInput}
                  onChange={(e) => setMaxChunkInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {oauthStatus && (
              <p className="text-xs font-mono text-cyan-300">{oauthStatus}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestLiveOAuth}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                Connect Account via OAuth2 Popup
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Vault Configuration
              </button>
            </div>
          </form>
        </section>

        {/* Google Cloud Console & Capacitor APK Setup Instructions */}
        <section className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                04. Google Cloud &amp; Android APK Deployment Guide
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                How to enable Google Drive v3, Gmail v1, Supabase RLS, and build the native Android APK
              </p>
            </div>

            <ol className="space-y-2.5 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
              <li>
                In <strong className="text-slate-100">Supabase</strong>, open SQL Editor, paste the <strong className="text-emerald-400">PostgreSQL / Supabase SQL Schema</strong> above, and click <strong className="text-slate-100">Run</strong>. Paste your <code className="text-cyan-400 font-mono">SUPABASE_URL</code> and <code className="text-cyan-400 font-mono">SUPABASE_ANON_KEY</code>.
              </li>
              <li>
                In <strong className="text-slate-100">Google Cloud Console</strong>, enable <code className="text-cyan-400 font-mono">Google Drive API</code> and <code className="text-cyan-400 font-mono">Gmail API</code>, configure OAuth Consent Screen, and add your Gmail nodes.
              </li>
              <li>
                Include <code className="text-emerald-400 font-mono">.../auth/drive.file</code>, <code className="text-emerald-400 font-mono">.../auth/drive.appdata</code>, and <code className="text-emerald-400 font-mono">.../auth/gmail.readonly</code> scopes for binary chunk uploads and 730-day heartbeats.
              </li>
              <li>
                Push this repository to <strong className="text-slate-100">GitHub</strong>: <code className="text-cyan-400 font-mono">capacitor.config.json</code> (<code className="text-slate-200 font-mono">com.omnipool.cloudhub</code>) and <code className="text-cyan-400 font-mono">.github/workflows/build-apk.yml</code> are pre-configured to automatically compile and upload <strong className="text-emerald-400">OmniPool-Android-APK</strong>.
              </li>
            </ol>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center gap-2.5 text-xs text-slate-400 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Capacitor APK Config: com.omnipool.cloudhub · WebDir: dist
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
