import React, { useMemo, useState } from 'react';
import {
  Search,
  Copy,
  RefreshCw,
  Send,
  Star,
  ExternalLink,
  MailOpen,
  KeyRound,
} from 'lucide-react';
import { useOmniPool } from '../context/OmniPoolContext';
import { UnifiedEmail } from '../types/omnipool';

export const UnifiedInboxView: React.FC = () => {
  const {
    emails,
    nodes,
    markEmailRead,
    toggleEmailStar,
    syncAllInboxes,
    isSyncingInboxes,
    setIsComposeModalOpen,
    showToast,
  } = useOmniPool();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('all');
  const [streamFilter, setStreamFilter] = useState<'all' | 'unread' | 'otp'>('all');
  const [activeEmailId, setActiveEmailId] = useState<string>(emails[0]?.id || '');

  const filteredEmails = useMemo(() => {
    return emails.filter((mail) => {
      if (selectedNodeId !== 'all' && mail.nodeId !== selectedNodeId && mail.recipientEmail !== selectedNodeId) {
        return false;
      }
      if (streamFilter === 'unread' && !mail.isUnread) {
        return false;
      }
      if (streamFilter === 'otp' && !mail.extractedOtp) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        mail.subject.toLowerCase().includes(q) ||
        mail.senderName.toLowerCase().includes(q) ||
        mail.senderEmail.toLowerCase().includes(q) ||
        mail.recipientEmail.toLowerCase().includes(q) ||
        mail.body.toLowerCase().includes(q) ||
        (mail.extractedOtp && mail.extractedOtp.includes(q))
      );
    });
  }, [emails, selectedNodeId, streamFilter, searchQuery]);

  const activeEmail: UnifiedEmail | undefined =
    filteredEmails.find((e) => e.id === activeEmailId) || filteredEmails[0];

  const handleCopyOtp = (otp: string, recipient: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(otp).catch(() => {});
    showToast(`Copied OTP code ${otp} (received on ${recipient}).`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Unified Master Inbox & OTP Catcher
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Aggregating incoming messages across all {nodes.length} Gmail accounts with automatic 4–8 digit OTP extraction
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsComposeModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Compose Unified Email
          </button>
          <button
            type="button"
            disabled={isSyncingInboxes}
            onClick={() => syncAllInboxes()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncingInboxes ? 'animate-spin' : ''}`} />
            {isSyncingInboxes ? 'Syncing Inboxes...' : 'Sync All Inboxes (+Catch OTP)'}
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Search across all 25+ Gmail inboxes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subject, OTP code, sender, or recipient node..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="lg:col-span-4">
          <label htmlFor="inbox-node-filter" className="sr-only">
            Filter by specific Gmail node
          </label>
          <select
            id="inbox-node-filter"
            aria-label="Filter by specific Gmail node"
            value={selectedNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Connected Gmail Nodes ({nodes.length} accounts)</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                To: {node.email} ({node.alias})
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3 flex justify-end">
          <div
            role="group"
            aria-label="Filter email stream"
            className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg w-full sm:w-auto justify-center"
          >
            <button
              type="button"
              onClick={() => setStreamFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                streamFilter === 'all'
                  ? 'bg-slate-800 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({emails.length})
            </button>
            <button
              type="button"
              onClick={() => setStreamFilter('unread')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                streamFilter === 'unread'
                  ? 'bg-slate-800 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unread ({emails.filter((e) => e.isUnread).length})
            </button>
            <button
              type="button"
              onClick={() => setStreamFilter('otp')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                streamFilter === 'otp'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              OTPs Only ({emails.filter((e) => Boolean(e.extractedOtp)).length})
            </button>
          </div>
        </div>
      </div>

      {/* Master Split View: Email List (Left 7 cols) + Reader Inspector (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Email Stream List */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl divide-y divide-slate-800/80 overflow-hidden">
          {filteredEmails.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-300">
                No messages match your active inbox filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedNodeId('all');
                  setStreamFilter('all');
                }}
                className="px-3.5 py-1.5 text-xs bg-slate-800 text-emerald-300 rounded-lg cursor-pointer"
              >
                Show All Messages
              </button>
            </div>
          ) : (
            filteredEmails.map((mail) => {
              const isSelected = activeEmail?.id === mail.id;
              return (
                <div
                  key={mail.id}
                  onClick={() => {
                    setActiveEmailId(mail.id);
                    markEmailRead(mail.id, false);
                  }}
                  className={`p-4 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected ? 'bg-slate-800/70' : 'hover:bg-slate-800/35'
                  }`}
                >
                  <div className="min-w-0 space-y-1 flex-1">
                    {/* Recipient & Sender Metadata Line */}
                    <div className="flex flex-wrap items-center gap-y-1 text-xs font-mono tabular-nums">
                      <span
                        className={
                          mail.isUnread
                            ? 'font-semibold text-slate-100'
                            : 'text-slate-400'
                        }
                      >
                        {mail.senderName}
                      </span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span className="text-cyan-400 font-medium">
                        To: {mail.recipientEmail}
                      </span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span className="text-slate-500">
                        {new Date(mail.receivedAtIso).toISOString().slice(11, 16)} UTC
                      </span>
                    </div>

                    {/* Subject Line */}
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm truncate ${
                          mail.isUnread
                            ? 'font-semibold text-slate-100'
                            : 'font-normal text-slate-300'
                        }`}
                      >
                        {mail.subject}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-400 truncate">{mail.snippet}</p>
                  </div>

                  {/* Right Side: One-Click Copy OTP Button & Star */}
                  <div className="flex items-center gap-2 shrink-0">
                    {mail.extractedOtp && (
                      <button
                        type="button"
                        onClick={(e) =>
                          handleCopyOtp(mail.extractedOtp!, mail.recipientEmail, e)
                        }
                        aria-label={`Copy OTP ${mail.extractedOtp}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy OTP: {mail.extractedOtp}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEmailStar(mail.id);
                      }}
                      aria-label={`Star email ${mail.subject}`}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        mail.isStarred
                          ? 'text-amber-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Email Inspector / Reader Pane */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          {activeEmail ? (
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                  <span className="text-cyan-400 font-semibold">
                    To: {activeEmail.recipientEmail}
                  </span>
                  <span>
                    {new Date(activeEmail.receivedAtIso)
                      .toISOString()
                      .replace('T', ' ')
                      .slice(0, 19)}{' '}
                    UTC
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-100">
                  {activeEmail.subject}
                </h2>
                <div className="text-xs text-slate-400 font-mono">
                  From: <span className="text-slate-200">{activeEmail.senderName}</span> &lt;
                  {activeEmail.senderEmail}&gt;
                </div>
              </div>

              {/* Extracted OTP & Verification URL Callout */}
              {(activeEmail.extractedOtp || activeEmail.verificationUrl) && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <KeyRound className="w-4 h-4" />
                      Automated OTP & Link Extractor
                    </div>
                    {activeEmail.extractedOtp && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyOtp(
                            activeEmail.extractedOtp!,
                            activeEmail.recipientEmail
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy OTP: {activeEmail.extractedOtp}
                      </button>
                    )}
                  </div>

                  {activeEmail.verificationUrl && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-slate-400 truncate">
                        Link: {activeEmail.verificationUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(activeEmail.verificationUrl!)
                            .catch(() => {});
                          showToast('Copied verification URL to clipboard.', 'info');
                        }}
                        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 shrink-0 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Copy URL
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Message Body */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                {activeEmail.body}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-slate-400">
              Select an incoming email from the unified stream to inspect its body and OTP payload.
            </div>
          )}

          {activeEmail && (
            <div className="pt-4 mt-6 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => markEmailRead(activeEmail.id, !activeEmail.isUnread)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <MailOpen className="w-3.5 h-3.5" />
                Mark as {activeEmail.isUnread ? 'Read' : 'Unread'}
              </button>

              <button
                type="button"
                onClick={() => setIsComposeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                Reply from {activeEmail.recipientEmail}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
