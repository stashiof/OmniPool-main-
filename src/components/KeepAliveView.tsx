import React, { useState } from 'react';
import {
  Activity,
  Terminal,
  Clock,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { useOmniPool } from '../context/OmniPoolContext';
import {
  calculateInactivityDaysRemaining,
  generatePythonKeepAliveScript,
} from '../utils/poolEngine';

export const KeepAliveView: React.FC = () => {
  const {
    nodes,
    stats,
    heartbeatLogs,
    settings,
    updateSettings,
    executeGlobalHeartbeat,
    isHeartbeatRunning,
    heartbeatProgress,
    clearHeartbeatLogs,
    showToast,
  } = useOmniPool();

  const [showCronExporter, setShowCronExporter] = useState(false);

  const pythonScript = generatePythonKeepAliveScript(
    nodes,
    settings.heartbeatIntervalDays
  );

  const handleDownloadPythonScript = () => {
    const blob = new Blob([pythonScript], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'omnipool_keepalive_daemon.py';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded standalone Python/Termux keepalive_daemon.py script.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Anti-Delete "Keep-Alive" Automation Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated OAuth2 authentication, 1-byte Drive <code className="text-cyan-400 font-mono">appDataFolder</code> pulse, and Gmail <code className="text-cyan-400 font-mono">INBOX</code> query to reset Google's 730-day inactivity policy
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isHeartbeatRunning}
            onClick={() => executeGlobalHeartbeat()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            {isHeartbeatRunning
              ? `Executing Heartbeat (${heartbeatProgress.current}/${heartbeatProgress.total})...`
              : `Execute Heartbeat Across All ${nodes.length} Accounts`}
          </button>

          <button
            type="button"
            onClick={() => setShowCronExporter(!showCronExporter)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            {showCronExporter ? 'Hide Python/Termux Script' : 'Export Python / Termux Cron Script'}
          </button>
        </div>
      </div>

      {/* Schedule Config + Policy Status Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Auto-Schedule Configuration */}
        <section className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  Auto-Schedule Configuration
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {settings.autoHeartbeatEnabled ? 'DAEMON ACTIVE' : 'PAUSED'}
              </span>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Automated Heartbeat Cadence
              </label>
              <div
                role="group"
                aria-label="Heartbeat Interval Days"
                className="grid grid-cols-3 gap-2.5"
              >
                {([7, 30, 90] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => updateSettings({ heartbeatIntervalDays: days })}
                    className={`py-2.5 px-3 text-xs font-mono font-semibold rounded-lg border transition-colors cursor-pointer ${
                      settings.heartbeatIntervalDays === days
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Every {days} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  Background Browser Keep-Alive Trigger
                </div>
                <div className="text-xs text-slate-400">
                  Automatically run keep-alive when OmniPool opens if interval elapsed
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.autoHeartbeatEnabled}
                onClick={() =>
                  updateSettings({
                    autoHeartbeatEnabled: !settings.autoHeartbeatEnabled,
                  })
                }
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors cursor-pointer ${
                  settings.autoHeartbeatEnabled
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {settings.autoHeartbeatEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs font-mono tabular-nums text-slate-400">
            <div className="flex justify-between">
              <span>Last Global Heartbeat:</span>
              <span className="text-slate-200">
                {new Date(settings.lastGlobalHeartbeatIso)
                  .toISOString()
                  .replace('T', ' ')
                  .slice(0, 19)}{' '}
                UTC
              </span>
            </div>
            <div className="flex justify-between">
              <span>Accounts at 2-Year Deletion Risk:</span>
              <span className="text-emerald-400 font-semibold">
                {stats.atRiskNodesCount} Accounts (All Safe)
              </span>
            </div>
          </div>
        </section>

        {/* Real-Time Terminal Log Viewer */}
        <section className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-mono font-semibold text-slate-100">
                Real-Time Keep-Alive Execution Terminal
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {heartbeatLogs.length} log entries
              </span>
              <button
                type="button"
                onClick={clearHeartbeatLogs}
                aria-label="Clear terminal logs"
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>

          <div
            aria-live="polite"
            className="h-72 overflow-y-auto font-mono text-xs space-y-1.5 pr-2"
          >
            {heartbeatLogs.length === 0 ? (
              <div className="text-slate-500 py-12 text-center">
                Terminal buffer ready. Click "Execute Heartbeat" to run the 3-step anti-delete sequence across all {nodes.length} nodes.
              </div>
            ) : (
              heartbeatLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/60 px-2 py-0.5 rounded"
                >
                  <span className="text-slate-500 tabular-nums shrink-0">
                    {new Date(entry.timestampIso).toISOString().slice(11, 19)}
                  </span>
                  <span
                    className={
                      entry.step === 'GMAIL_PING'
                        ? 'text-emerald-400 font-medium'
                        : entry.step === 'DRIVE_WRITE'
                        ? 'text-cyan-300'
                        : 'text-slate-300'
                    }
                  >
                    {entry.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Standalone Python / Termux Cron Script Exporter */}
      {showCronExporter && (
        <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Standalone Python / Termux Crontab Script
              </h2>
              <p className="text-xs text-slate-400">
                Pre-configured with your {nodes.length} Gmail nodes and a {settings.heartbeatIntervalDays}-day cron schedule
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(pythonScript).catch(() => {});
                  showToast('Copied Python cron script to clipboard.', 'success');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                Copy Script
              </button>
              <button
                type="button"
                onClick={handleDownloadPythonScript}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download .py
              </button>
            </div>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
            {pythonScript}
          </pre>
        </section>
      )}

      {/* Node-by-Node 730-Day Inactivity Compliance Matrix */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              730-Day Google Inactivity Policy Compliance Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Countdown showing exact days remaining before Google's 2-year inactivity policy threshold
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400">
            {stats.atRiskNodesCount === 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4" />0 Nodes at Risk
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                {stats.atRiskNodesCount} Nodes Need Attention
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {nodes.map((node) => {
            const daysLeft = calculateInactivityDaysRemaining(node.lastActivityIso);
            const pctLeft = Math.min(100, Math.round((daysLeft / 730) * 100));
            return (
              <div
                key={node.id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5 font-mono tabular-nums"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 truncate">{node.email.split('@')[0]}</span>
                  <span className="text-emerald-400 font-semibold">{daysLeft}d</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pctLeft}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Last: {new Date(node.lastActivityIso).toISOString().slice(0, 10)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
