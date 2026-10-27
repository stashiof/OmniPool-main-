import React from 'react';
import {
  HardDrive,
  ShieldCheck,
  Mail,
  Activity,
  Upload,
  Plus,
  RefreshCw,
  Copy,
  ArrowUpRight,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Database,
  LogOut,
  ExternalLink,
  KeyRound,
  Play,
  Image,
  Users,
  Code,
  Shield,
} from 'lucide-react';
import { useOmniPool } from '../context/OmniPoolContext';
import { calculateInactivityDaysRemaining } from '../utils/poolEngine';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    cloudSyncStatus,
    setIsAuthModalOpen,
    logoutTenant,
    nodes,
    files,
    emails,
    stats,
    setActiveTab,
    setIsUploadModalOpen,
    setIsAddNodeModalOpen,
    executeGlobalHeartbeat,
    isHeartbeatRunning,
    heartbeatProgress,
    syncAllInboxes,
    isSyncingInboxes,
    showToast,
  } = useOmniPool();

  const [selectedLauncherNodeId, setSelectedLauncherNodeId] = React.useState<string>('');
  const activeLauncherNode =
    nodes.find((n) => n.id === selectedLauncherNodeId) || nodes[0] || null;

  const buildAccountChooserUrl = (email: string, continueUrl: string) =>
    `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(
      email
    )}&continue=${encodeURIComponent(continueUrl)}`;

  const otpEmails = emails.filter((e) => Boolean(e.extractedOtp)).slice(0, 4);
  const recentFiles = files.slice(0, 5);

  const minDaysRemaining =
    nodes.length > 0
      ? Math.min(...nodes.map((n) => calculateInactivityDaysRemaining(n.lastActivityIso)))
      : 730;

  const handleCopyOtp = (otp: string, recipient: string) => {
    navigator.clipboard?.writeText(otp).catch(() => {});
    showToast(`Copied OTP ${otp} (for ${recipient}) to clipboard.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Workspace Mode, Active Tenant & Quick Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Command Center Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Account <strong className="font-mono text-cyan-400">{currentUser?.phoneNumber}</strong> ·{' '}
            <span>{cloudSyncStatus}</span> ·{' '}
            <span className="font-mono tabular-nums text-emerald-400">
              {stats.totalPoolGb.toFixed(1)} GB
            </span>{' '}
            pooled across {stats.totalNodes} Google accounts
          </p>
        </div>

        {/* Account Switcher, Cloud DB Setup & Logout */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Supabase &amp; OAuth Setup
          </button>

          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="px-3 py-1.5 text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Account ({currentUser?.phoneNumber})
          </button>

          <button
            type="button"
            onClick={() => logoutTenant()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* First-Time Onboarding Banner when 0 Gmail Nodes are connected */}
      {nodes.length === 0 && (
        <section
          aria-label="Getting Started Onboarding"
          className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="text-xs font-mono text-emerald-400 font-semibold">
              WELCOME TO YOUR PERSONAL CLOUD VAULT ({currentUser?.phoneNumber})
            </div>
            <h2 className="text-base font-bold text-slate-100">
              আপনার অ্যাকাউন্ট তৈরি হয়েছে! এখন প্রথম Gmail Node যুক্ত করে ১৫ জিবি স্টোরেজ পুল শুরু করুন
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              এই অ্যাকাউন্টের আন্ডারে আপনি যতগুলো Gmail যুক্ত করবেন বা ফাইল আপলোড করবেন, সবকিছু স্বয়ংক্রিয়ভাবে আপনার <code className="text-cyan-400 font-mono">{currentUser?.userId}</code> আইডির আন্ডারে ডাটাবেজে সেভ থাকবে।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddNodeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              প্রথম Gmail Node যুক্ত করুন (+15 GB)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('modules')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              Supabase SQL ও সেটিংস দেখুন
            </button>
          </div>
        </section>
      )}

      {/* Google All-Services Account Switcher & Quick Launcher (YouTube, Play Store, Gmail, Drive, Photos) */}
      {activeLauncherNode && (
        <section
          aria-label="Google All-Services Account Hub"
          className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-5 space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono font-semibold text-cyan-400">
                GOOGLE ALL-SERVICES ACCOUNT HUB (মোবাইলের মতো সব সার্ভিসে এক ক্লিকে অ্যাক্সেস)
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                যেকোনো লগইন করা জিমেইল সিলেক্ট করে সরাসরি সেই জিমেইল দিয়ে{' '}
                <strong className="text-slate-100">
                  YouTube, Play Store, Gmail, Google Drive, Photos, Contacts
                </strong>{' '}
                চালু করুন:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Select Active Gmail Account for Google Services"
                value={activeLauncherNode.id}
                onChange={(e) => setSelectedLauncherNodeId(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.email} ({n.alias}) — {(n.totalGb - n.usedGb).toFixed(1)} GB Free
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(activeLauncherNode.email).catch(() => {});
                  showToast(`Copied Email: ${activeLauncherNode.email}`, 'success');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                Copy Email
              </button>

              {activeLauncherNode.appPassword && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(activeLauncherNode.appPassword || '')
                      .catch(() => {});
                    showToast(
                      `Copied saved password for ${activeLauncherNode.email}`,
                      'success'
                    );
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  Copy Password
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              {
                label: 'YouTube',
                sub: 'চ্যানেল ও ভিডিও',
                url: 'https://www.youtube.com',
                icon: Play,
                cls: 'text-rose-300 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20',
              },
              {
                label: 'Play Store',
                sub: 'অ্যাপস ও গেমস',
                url: 'https://play.google.com/store/apps',
                icon: Layers,
                cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
              },
              {
                label: 'Gmail',
                sub: 'ইমেইল ও ওটিপি',
                url: 'https://mail.google.com/mail/u/0/',
                icon: Mail,
                cls: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20',
              },
              {
                label: 'Google Drive',
                sub: '১৫ জিবি ক্লাউড',
                url: 'https://drive.google.com/drive/my-drive',
                icon: HardDrive,
                cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20',
              },
              {
                label: 'Google Photos',
                sub: 'ছবি ও গ্যালারি',
                url: 'https://photos.google.com',
                icon: Image,
                cls: 'text-purple-300 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20',
              },
              {
                label: 'Contacts',
                sub: 'ফোন নম্বর সেভ',
                url: 'https://contacts.google.com',
                icon: Users,
                cls: 'text-sky-300 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20',
              },
              {
                label: 'Google Colab',
                sub: 'ফ্রি ক্লাউড GPU',
                url: 'https://colab.research.google.com',
                icon: Code,
                cls: 'text-orange-300 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20',
              },
              {
                label: 'My Account',
                sub: 'সিকিউরিটি ও লগইন',
                url: 'https://myaccount.google.com',
                icon: Shield,
                cls: 'text-slate-200 border-slate-700 bg-slate-800/80 hover:bg-slate-700',
              },
            ].map((srv) => {
              const IconComp = srv.icon;
              return (
                <a
                  key={srv.label}
                  href={buildAccountChooserUrl(activeLauncherNode.email, srv.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col justify-between p-2.5 rounded-lg border transition-colors ${srv.cls}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <IconComp className="w-3.5 h-3.5 shrink-0" />
                    <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-semibold leading-tight">{srv.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5 truncate">{srv.sub}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Aggregated Storage Pool Hero Card */}
      <section
        aria-label="Aggregated Storage Pool"
        className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-emerald-400 tracking-wide">
              01. Aggregated Virtual Storage Pool
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 font-mono tabular-nums flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="whitespace-nowrap">Total Pool: {stats.totalPoolGb.toFixed(1)} GB</span>
              <span className="text-slate-600 font-normal">|</span>
              <span className="text-cyan-400 whitespace-nowrap">Used: {stats.usedPoolGb.toFixed(1)} GB</span>
              <span className="text-slate-600 font-normal">|</span>
              <span className="text-emerald-400 whitespace-nowrap">Free: {stats.freePoolGb.toFixed(1)} GB</span>
            </h2>
            <p className="text-xs text-slate-400">
              Pooled across <span className="font-mono tabular-nums text-slate-200">{stats.totalNodes}</span>{' '}
              connected Google Drive nodes (15 GB allocation per account) ·{' '}
              <span className="font-mono tabular-nums text-slate-200">{stats.usagePercent}%</span> utilized
            </p>
          </div>

          {/* 4 Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload to Pool
            </button>
            <button
              type="button"
              disabled={isHeartbeatRunning}
              onClick={() => executeGlobalHeartbeat()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              {isHeartbeatRunning
                ? `Heartbeat (${heartbeatProgress.current}/${heartbeatProgress.total})`
                : 'Trigger Global Keep-Alive'}
            </button>
            <button
              type="button"
              onClick={() => setIsAddNodeModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Gmail Node
            </button>
            <button
              type="button"
              disabled={isSyncingInboxes}
              onClick={() => syncAllInboxes()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingInboxes ? 'animate-spin' : ''}`} />
              {isSyncingInboxes ? 'Syncing...' : 'Sync All Inboxes'}
            </button>
          </div>
        </div>

        {/* Multi-Segment Visual Progress Bar across all connected nodes */}
        <div className="space-y-2">
          <div
            className="h-4 w-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex p-0.5 gap-0.5"
            role="progressbar"
            aria-valuenow={stats.usagePercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Multi-node storage pool utilization"
          >
            {nodes.map((node, idx) => {
              const widthPct =
                stats.totalPoolGb > 0 ? (node.usedGb / stats.totalPoolGb) * 100 : 0;
              if (widthPct <= 0.05) return null;
              return (
                <div
                  key={node.id}
                  style={{ width: `${Math.max(widthPct, 0.4)}%` }}
                  title={`${node.email} (${node.alias}): ${node.usedGb.toFixed(1)} GB / ${node.totalGb} GB`}
                  className={`h-full first:rounded-l last:rounded-r transition-opacity hover:opacity-80 ${
                    idx % 2 === 0 ? 'bg-emerald-500' : 'bg-cyan-500'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
            <span>
              Allocated Segments: {nodes.filter((n) => n.usedGb > 0).length} / {nodes.length} nodes carrying shards
            </span>
            <span>
              Available Contiguous Virtual Volume: {stats.freePoolGb.toFixed(2)} GB (
              {stats.totalNodes > 0 ? (100 - stats.usagePercent).toFixed(1) : '0.0'}% free)
            </span>
          </div>
        </div>
      </section>

      {/* System Health & Status 4-Column Metric Strip */}
      <section
        aria-label="System Health and Status"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Connected Gmail Nodes</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              {stats.totalNodes} Nodes
            </span>
            <span className="text-xs font-mono tabular-nums text-emerald-400">
              {stats.totalNodes * 15} GB Quota
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {stats.totalNodes === 0
              ? 'No Gmail nodes connected yet'
              : `${stats.totalNodes} Google Drive nodes active`}
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active OAuth Token Health</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              {stats.activeTokens} / {stats.totalNodes}
            </span>
            <span className="text-xs font-mono tabular-nums text-cyan-400">
              {stats.totalNodes === 0
                ? 'Standby'
                : stats.refreshNeededTokens === 0
                ? '100% Healthy'
                : `${stats.refreshNeededTokens} Refresh Needed`}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Cloud DB + IndexedDB token vault
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Unified Unread &amp; OTPs</span>
            <Mail className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              {emails.filter((e) => e.isUnread).length} Unread
            </span>
            <span className="text-xs font-mono tabular-nums text-emerald-400">
              {emails.filter((e) => Boolean(e.extractedOtp)).length} OTPs Caught
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Real-time 4–8 digit verification extractor
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Inactivity Deletion Risk</span>
            {stats.atRiskNodesCount === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400 whitespace-nowrap">
              {stats.atRiskNodesCount} At Risk
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-300 whitespace-nowrap">
              730d Policy Safe
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {nodes.length > 0
              ? `Min remaining: ${minDaysRemaining} days before expiry`
              : '730-day Google policy monitor ready'}
          </p>
        </div>
      </section>

      {/* Two-Column Split: Recent Pooled Files & Live OTP Catcher Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Recent Virtual Drive Pool Allocations */}
        <section className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  02. Virtual Drive Pool Index &amp; RAID Shards
                </h3>
                <p className="text-xs text-slate-400">
                  Files spanning single or multiple 15 GB Gmail Drive allocations
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('drive')}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Virtual Drive
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentFiles.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  এখনো কোনো ফাইল আপলোড করা হয়নি। আগে কমপক্ষে ১টি Gmail Node যুক্ত করে আপনার ফোন বা পিসি থেকে আসল ফাইল আপলোড করুন।
                </p>
                <button
                  type="button"
                  onClick={() =>
                    nodes.length === 0
                      ? setIsAddNodeModalOpen(true)
                      : setActiveTab('drive')
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg cursor-pointer"
                >
                  {nodes.length === 0 ? '+ Add Gmail Node First' : '+ Upload File to Pool'}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-100 truncate">
                          {file.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                        <span>{file.folderPath}</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span className="text-emerald-400 font-semibold">
                          {file.sizeGb.toFixed(2)} GB
                        </span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span>
                          {file.isChunked
                            ? `Split across ${file.chunks.length} nodes (${file.chunks
                                .map((c) => c.nodeEmail.split('@')[0])
                                .join(', ')})`
                            : `Stored on ${file.chunks[0]?.nodeEmail}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                      {file.isChunked ? 'RAID Chunked' : 'Single Node'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Total Indexed Virtual Files:{' '}
              <strong className="font-mono tabular-nums text-slate-200">{files.length}</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              + Upload File to Pool
            </button>
          </div>
        </section>

        {/* Right 5 Cols: Instant OTP & Verification Catcher Stream */}
        <section className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  03. Live OTP &amp; Verification Catcher
                </h3>
                <p className="text-xs text-slate-400">
                  Auto-extracted 4–8 digit security codes across all {stats.totalNodes} inboxes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Unified Inbox
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {otpEmails.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  এখনো কোনো OTP মেইল নেই। আপনার Gmail Node কানেক্ট করে ইনবক্স সিঙ্ক করলে সকল ভেরিফিকেশন কোড এখানে দেখাবে।
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {otpEmails.map((mail) => (
                  <div
                    key={mail.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-slate-400 font-mono tabular-nums">
                        <span>{mail.senderName}</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span className="text-cyan-400">To: {mail.recipientEmail}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-200 truncate mt-0.5">
                        {mail.subject}
                      </p>
                    </div>

                    {mail.extractedOtp && (
                      <button
                        type="button"
                        onClick={() => handleCopyOtp(mail.extractedOtp!, mail.recipientEmail)}
                        aria-label={`Copy OTP ${mail.extractedOtp} for ${mail.recipientEmail}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy OTP: {mail.extractedOtp}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Listening across {stats.totalNodes} accounts</span>
            <button
              type="button"
              onClick={() => syncAllInboxes()}
              className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
            >
              Sync All Inboxes
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
