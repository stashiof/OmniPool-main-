import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Mail,
  HardDrive,
  Compass,
  KeyRound,
} from 'lucide-react';
import { useOmniPool } from '../context/OmniPoolContext';
import { AccountNode } from '../types/omnipool';
import { calculateInactivityDaysRemaining } from '../utils/poolEngine';

const GOOGLE_ECOSYSTEM_APPS = [
  {
    id: 'youtube',
    name: 'YouTube',
    subtitle: 'চ্যানেল, সাবস্ক্রিপশন ও ভিডিও',
    badge: 'Video & Channel',
    buildUrl: (email: string) =>
      `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(
        email
      )}&continue=${encodeURIComponent('https://www.youtube.com/')}`,
  },
  {
    id: 'playstore',
    name: 'Google Play Store',
    subtitle: 'অ্যাপ ডাউনলোড ও লাইব্রেরি',
    badge: 'Apps & Games',
    buildUrl: (email: string) =>
      `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(
        email
      )}&continue=${encodeURIComponent('https://play.google.com/store/games')}`,
  },
  {
    id: 'gmail',
    name: 'Gmail Web',
    subtitle: 'সম্পূর্ণ মেইলবক্স ও সেটিংস',
    badge: 'Mail Hub',
    buildUrl: (email: string) =>
      `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(
        email
      )}&continue=${encodeURIComponent(
        `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(email)}`
      )}`,
  },
  {
    id: 'drive',
    name: 'Google Drive (15 GB)',
    subtitle: 'ক্লাউড ফাইল ও ফোল্ডার',
    badge: '15 GB Cloud',
    buildUrl: (email: string) =>
      `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(
        email
      )}&continue=${encodeURIComponent(
        `https://drive.google.com/drive/u/?authuser=${encodeURIComponent(email)}`
      )}`,
  },
  {
    id: 'photos',
    name: 'Google Photos',
    subtitle: 'ছবি ও ভিডিও গ্যালারি ব্যাকআপ',
    badge: 'Photos Backup',
    buildUrl: (email: string) =>
      `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(
        email
      )}&continue=${encodeURIComponent(
        `https://photos.google.com/?authuser=${encodeURIComponent(email)}`
      )}`,
  },
  {
    id: 'contacts',
    name: 'Google Contacts',
    subtitle: 'ফোন নাম্বার ও কন্টাক্ট ব্যাকআপ',
    badge: 'Contacts Sync',
    buildUrl: (email: string) =>
      `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(
        email
      )}&continue=${encodeURIComponent(
        `https://contacts.google.com/?authuser=${encodeURIComponent(email)}`
      )}`,
  },
  {
    id: 'colab',
    name: 'Google Colab & Gemini',
    subtitle: 'ফ্রি GPU রানটাইম ও এআই',
    badge: 'Cloud GPU',
    buildUrl: (email: string) =>
      `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(
        email
      )}&continue=${encodeURIComponent(
        `https://colab.research.google.com/?authuser=${encodeURIComponent(email)}`
      )}`,
  },
  {
    id: 'myaccount',
    name: 'Google Account & Security',
    subtitle: 'পাসওয়ার্ড, 2FA ও App Password',
    badge: 'Security & 2FA',
    buildUrl: (email: string) =>
      `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(
        email
      )}&continue=${encodeURIComponent(
        `https://myaccount.google.com/?authuser=${encodeURIComponent(email)}`
      )}`,
  },
];

export const NodesManagerView: React.FC = () => {
  const {
    nodes,
    stats,
    refreshNodeToken,
    removeAccountNode,
    setIsAddNodeModalOpen,
    setIsUploadModalOpen,
    setIsComposeModalOpen,
    setActiveTab,
    exportNodesJson,
    importNodesJson,
    showToast,
  } = useOmniPool();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Refresh Needed'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isBulkJsonModalOpen, setIsBulkJsonModalOpen] = useState(false);
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [selectedHubNode, setSelectedHubNode] = useState<AccountNode | null>(null);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (statusFilter !== 'all' && node.tokenStatus !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        node.email.toLowerCase().includes(q) ||
        node.alias.toLowerCase().includes(q) ||
        String(node.nodeNumber).includes(q)
      );
    });
  }, [nodes, searchQuery, statusFilter]);

  const handleExportJson = () => {
    const json = exportNodesJson();
    setBulkJsonText(json);
    setBulkError(null);
    setIsBulkJsonModalOpen(true);
    navigator.clipboard?.writeText(json).catch(() => {});
    showToast('Exported account vault JSON & copied to clipboard.', 'success');
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = importNodesJson(bulkJsonText);
    if (!res.ok) {
      setBulkError(res.error || 'Import failed.');
      return;
    }
    setBulkError(null);
    setIsBulkJsonModalOpen(false);
  };

  const handleCopyText = (value: string, label: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    showToast(`${label} ক্লিপবোর্ডে কপি হয়েছে!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Account Nodes &amp; Google All-Services Hub ({stats.totalNodes} Gmail Vault)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            প্রতিটি জিমেইলের ১৫ জিবি ড্রাইভ, ইনবক্স এবং ১-ক্লিকে YouTube, Play Store, Drive, Photos ও Gmail অ্যাক্সেস
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddNodeModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Gmail Account
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Bulk Import / Export JSON
          </button>
        </div>
      </div>

      {/* Filter & View Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Search account nodes by email or alias"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gmail address or tag..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Segmented Control */}
          <div
            role="group"
            aria-label="Filter nodes by token status"
            className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg"
          >
            {(['all', 'Active', 'Refresh Needed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === status
                    ? 'bg-slate-800 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status === 'all' ? `All (${nodes.length})` : status}
              </button>
            ))}
          </div>

          {/* Grid / Table Toggle */}
          <div
            role="group"
            aria-label="View layout mode"
            className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg"
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table View"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {nodes.length === 0 ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-slate-100">
            আপনার অ্যাকাউন্টে এখনো কোনো Gmail যুক্ত করা হয়নি (0 Nodes)
          </p>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            এখানে যেকোনো জিমেইল লগইন বা যুক্ত করলে ওই জিমেইল দিয়ে সরাসরি ১৫ জিবি ড্রাইভ স্টোরেজ, ইনবক্স, YouTube, Play Store, Google Photos সহ গুগলের সব সার্ভিস ব্যবহার করতে পারবেন।
          </p>
          <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddNodeModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              প্রথম Gmail অ্যাকাউন্ট লগইন করুন (+15 GB)
            </button>
          </div>
        </div>
      ) : filteredNodes.length === 0 ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-medium text-slate-200">
            No Gmail account nodes match "{searchQuery}"
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNodes.map((node) => {
            const pct = Math.min(100, Number(((node.usedGb / node.totalGb) * 100).toFixed(1)));
            const daysRemaining = calculateInactivityDaysRemaining(node.lastActivityIso);
            const padded = String(node.nodeNumber).padStart(2, '0');

            return (
              <article
                key={node.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-colors space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Row: Email & Alias */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-mono tabular-nums text-slate-400">
                        <span>NODE-{padded}</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        <span className="text-cyan-400">{node.alias}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-100 font-mono truncate mt-0.5">
                        {node.email}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {node.tokenStatus === 'Active' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Refresh Needed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Individual Drive Usage Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-slate-300">
                        {node.usedGb.toFixed(1)} GB / {node.totalGb} GB
                      </span>
                      <span className="text-slate-400">
                        {(node.totalGb - node.usedGb).toFixed(1)} GB free ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full ${
                          pct > 85
                            ? 'bg-amber-400'
                            : node.nodeNumber % 2 === 0
                            ? 'bg-cyan-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Quick Google Services Bar right on Card */}
                  <div className="pt-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedHubNode(node)}
                      className="w-full py-2 px-3 text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      এই জিমেইল দিয়ে গুগলের সব সার্ভিস চালান (YouTube, Play, Drive)
                    </button>

                    <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono">
                      {GOOGLE_ECOSYSTEM_APPS.slice(0, 4).map((app) => (
                        <a
                          key={app.id}
                          href={app.buildUrl(node.email)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-center text-slate-300 hover:text-cyan-300 truncate transition-colors"
                        >
                          {app.name.replace('Google ', '').replace(' (15 GB)', '')}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Metadata Line: Last Activity & 730-Day Countdown */}
                  <div className="text-xs text-slate-400 font-mono tabular-nums pt-1 flex flex-wrap items-center gap-y-1">
                    <span>
                      Last Activity: {new Date(node.lastActivityIso).toISOString().slice(0, 10)}
                    </span>
                    <span className="mx-1.5 text-slate-600">·</span>
                    <span className="text-emerald-400">
                      {daysRemaining}d / 730d TTL
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyText(node.email, 'জিমেইল অ্যাড্রেস')}
                      className="px-2 py-1 text-[11px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded cursor-pointer"
                    >
                      Copy Email
                    </button>
                    {node.accessToken && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(node.accessToken!, 'পাসওয়ার্ড / টোকেন')}
                        className="px-2 py-1 text-[11px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 rounded cursor-pointer"
                      >
                        Copy Pass
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => refreshNodeToken(node.id)}
                      aria-label={`Refresh token for ${node.email}`}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-400" />
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAccountNode(node.id)}
                      aria-label={`Remove ${node.email}`}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* High-Density Table View */
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4">Node</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Alias</th>
                  <th className="py-3 px-4 text-right">Drive Usage</th>
                  <th className="py-3 px-4">Google Services</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm font-mono tabular-nums">
                {filteredNodes.map((node) => (
                  <tr key={node.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 text-xs text-slate-400">
                      NODE-{String(node.nodeNumber).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 px-4 text-slate-100 font-medium">{node.email}</td>
                    <td className="py-2.5 px-4 text-cyan-400 font-sans text-xs">{node.alias}</td>
                    <td className="py-2.5 px-4 text-right text-slate-200">
                      {node.usedGb.toFixed(1)} / {node.totalGb} GB
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => setSelectedHubNode(node)}
                        className="px-2.5 py-1 text-xs font-sans font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-md cursor-pointer"
                      >
                        Open Google Hub (YouTube, Play, Drive)
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => refreshNodeToken(node.id)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
                        >
                          Refresh
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAccountNode(node.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Google All-Services Account Hub Modal (YouTube, Play Store, Gmail, Drive, Photos, Contacts, Colab) */}
      {selectedHubNode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-hub-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs font-mono text-emerald-400">
                  ACTIVE GOOGLE ACCOUNT IDENTITY · NODE-{String(selectedHubNode.nodeNumber).padStart(2, '0')}
                </div>
                <h2
                  id="google-hub-modal-title"
                  className="text-lg font-bold text-slate-100 font-mono mt-0.5"
                >
                  {selectedHubNode.email}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  মোবাইলে জিমেইল লগইন করলে যেমন সব গুগল অ্যাপে অ্যাক্সেস পাওয়া যায়, নিখান থেকেও এই জিমেইল দিয়ে সব সার্ভিস ব্যবহার করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHubNode(null)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* 1-Click Auto-Login Credential Helper Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  ১-ক্লিক লগইন ক্রেডেনশিয়াল (যদি কোনো সার্ভিসে প্রথমবার পাসওয়ার্ড চায়)
                </div>
                <p className="text-[11px] text-slate-400">
                  ইমেইল বা পাসওয়ার্ড কপি করে যেকোনো গুগল পেজে পেস্ট করলেই সাথে সাথে লগইন হয়ে যাবে
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyText(selectedHubNode.email, 'জিমেইল অ্যাড্রেস')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 rounded-lg cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Email
                </button>
                {selectedHubNode.accessToken && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(selectedHubNode.accessToken!, 'পাসওয়ার্ড')
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Saved Password
                  </button>
                )}
              </div>
            </div>

            {/* In-App Direct Actions for this Gmail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedHubNode(null);
                  setIsUploadModalOpen(true);
                }}
                className="p-3.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-emerald-300">
                    অ্যাপের ভেতরে ফাইল আপলোড (Drive Pool)
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 font-mono">
                    Free: {(selectedHubNode.totalGb - selectedHubNode.usedGb).toFixed(1)} GB / {selectedHubNode.totalGb} GB
                  </div>
                </div>
                <HardDrive className="w-5 h-5 text-emerald-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedHubNode(null);
                  setActiveTab('inbox');
                  setIsComposeModalOpen(true);
                }}
                className="p-3.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-cyan-300">
                    এই জিমেইল থেকে ইমেইল পাঠান / ইনবক্স দেখুন
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 font-mono">
                    From: {selectedHubNode.email}
                  </div>
                </div>
                <Mail className="w-5 h-5 text-cyan-400 shrink-0" />
              </button>
            </div>

            {/* Full Google Ecosystem Grid (YouTube, Play Store, Gmail, Drive, Photos, Contacts, Colab, Security) */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-200">
                এই জিমেইল ({selectedHubNode.email}) দিয়ে গুগলের সকল সার্ভিস ওপেন করুন:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOOGLE_ECOSYSTEM_APPS.map((service) => (
                  <a
                    key={service.id}
                    href={service.buildUrl(selectedHubNode.email)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-cyan-400">
                        {service.badge}
                      </div>
                      <div className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
                        {service.name}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {service.subtitle}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk JSON Import / Export Modal */}
      {isBulkJsonModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-json-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="bulk-json-modal-title" className="text-lg font-bold text-slate-100">
                Bulk Import / Export Account Vault Configuration (JSON)
              </h2>
              <button
                type="button"
                onClick={() => setIsBulkJsonModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="vault-json-textarea"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Account Nodes JSON Payload (Edit or paste JSON array to bulk-import nodes)
                </label>
                <textarea
                  id="vault-json-textarea"
                  rows={10}
                  value={bulkJsonText}
                  onChange={(e) => setBulkJsonText(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {bulkError && (
                <p className="text-xs text-rose-400 font-medium">{bulkError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(bulkJsonText).catch(() => {});
                    showToast('Copied JSON configuration to clipboard.', 'success');
                  }}
                  className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Copy JSON
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import Accounts from JSON
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
