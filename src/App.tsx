/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Server,
  HardDrive,
  Mail,
  Activity,
  Cpu,
  Plus,
} from 'lucide-react';
import {
  ActiveTabId,
  OmniPoolProvider,
  useOmniPool,
} from './context/OmniPoolContext';
import { DashboardView } from './components/DashboardView';
import { NodesManagerView } from './components/NodesManagerView';
import { VirtualDriveView } from './components/VirtualDriveView';
import { UnifiedInboxView } from './components/UnifiedInboxView';
import { KeepAliveView } from './components/KeepAliveView';
import { ModulesSettingsView } from './components/ModulesSettingsView';
import { GlobalModals } from './components/Modals';
import { AuthGateModal, FullScreenAuthGate } from './components/AuthGateModal';

const NAV_ITEMS: Array<{
  id: ActiveTabId;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    id: 'dashboard',
    label: 'Command Center',
    shortLabel: 'Overview',
    icon: LayoutDashboard,
  },
  {
    id: 'nodes',
    label: 'Account Nodes',
    shortLabel: 'Nodes',
    icon: Server,
  },
  {
    id: 'drive',
    label: 'Virtual Drive Pool',
    shortLabel: 'Drive Pool',
    icon: HardDrive,
  },
  {
    id: 'inbox',
    label: 'Unified Inbox',
    shortLabel: 'Inbox',
    icon: Mail,
  },
  {
    id: 'keepalive',
    label: 'Keep-Alive Engine',
    shortLabel: 'Keep-Alive',
    icon: Activity,
  },
  {
    id: 'modules',
    label: 'Modules & Settings',
    shortLabel: 'Cloud DB',
    icon: Cpu,
  },
];

const OmniPoolWorkspace: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    cloudSyncStatus,
    setIsAuthModalOpen,
    stats,
    emails,
    files,
    toast,
    setIsAddNodeModalOpen,
  } = useOmniPool();

  if (!currentUser) {
    return <FullScreenAuthGate />;
  }

  const unreadCount = emails.filter((e) => e.isUnread).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16 md:pb-0">
      {/* Top Bar Contract: Zone 1 (Single wordmark) — Zone 2 (5 concise nav links) — Zone 3 (1 primary CTA) */}
      <header className="flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 h-12 sm:h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-emerald-400 font-display whitespace-nowrap shrink-0"
        >
          OmniPool
        </a>

        <nav
          aria-label="Primary Top Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
        >
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-emerald-400 underline underline-offset-8 decoration-emerald-500'
                : ''
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nodes')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'nodes'
                ? 'text-emerald-400 underline underline-offset-8 decoration-emerald-500'
                : ''
            }`}
          >
            Nodes ({stats.totalNodes})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'drive'
                ? 'text-emerald-400 underline underline-offset-8 decoration-emerald-500'
                : ''
            }`}
          >
            Drive Pool
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'inbox'
                ? 'text-emerald-400 underline underline-offset-8 decoration-emerald-500'
                : ''
            }`}
          >
            Unified Inbox
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'modules'
                ? 'text-emerald-400 underline underline-offset-8 decoration-emerald-500'
                : ''
            }`}
          >
            Cloud DB &amp; APK
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddNodeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Gmail Node
          </button>
        </div>
      </header>

      {/* Main Workspace Container: Left Sidebar (260px on Desktop) + Active Module Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row">
        <aside
          aria-label="Workspace Modules Sidebar"
          className="hidden md:flex lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950 p-4 flex-col justify-between shrink-0"
        >
          <div className="space-y-1">
            <div className="px-3 py-2 text-xs font-medium text-slate-500 flex items-center justify-between">
              <span>Workspace Modules</span>
              <span className="font-mono text-[11px] text-emerald-400">
                {currentUser.phoneNumber}
              </span>
            </div>
            <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>

                    {item.id === 'nodes' && (
                      <span className="font-mono tabular-nums text-[11px] text-slate-400">
                        {stats.totalNodes}
                      </span>
                    )}
                    {item.id === 'drive' && (
                      <span className="font-mono tabular-nums text-[11px] text-cyan-400">
                        {files.length}
                      </span>
                    )}
                    {item.id === 'inbox' && unreadCount > 0 && (
                      <span className="font-mono tabular-nums text-[11px] text-emerald-400">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quiet Pool & Cloud Sync Summary in Sidebar Footer */}
          <div className="hidden lg:block pt-4 mt-6 border-t border-slate-800 space-y-2 px-2 text-xs font-mono tabular-nums text-slate-400">
            <div className="flex justify-between">
              <span>Tenant Vault</span>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                {currentUser.phoneNumber}
              </button>
            </div>
            <div className="flex justify-between">
              <span>Sync State</span>
              <span className="text-emerald-400">{cloudSyncStatus}</span>
            </div>
            <div className="flex justify-between">
              <span>Pooled Capacity</span>
              <span className="text-emerald-400 font-semibold">
                {stats.totalPoolGb.toFixed(0)} GB
              </span>
            </div>
            <div className="flex justify-between">
              <span>Used / Free</span>
              <span className="text-slate-200">
                {stats.usedPoolGb.toFixed(1)} / {stats.freePoolGb.toFixed(1)} GB
              </span>
            </div>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-7 max-w-[1440px] w-full mx-auto">
          {toast && (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 px-4 py-3 rounded-xl border border-emerald-500/40 bg-slate-900/95 text-xs font-mono text-emerald-300 flex items-center justify-between"
            >
              <span>{toast.message}</span>
            </div>
          )}

          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'nodes' && <NodesManagerView />}
          {activeTab === 'drive' && <VirtualDriveView />}
          {activeTab === 'inbox' && <UnifiedInboxView />}
          {activeTab === 'keepalive' && <KeepAliveView />}
          {activeTab === 'modules' && <ModulesSettingsView />}
        </main>
      </div>

      {/* Native Android APK / Mobile Fixed Bottom Tab Bar (< 768px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-6 items-center h-14 px-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[56px]">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

      <GlobalModals />
      <AuthGateModal />
    </div>
  );
};

export default function App() {
  return (
    <OmniPoolProvider>
      <OmniPoolWorkspace />
    </OmniPoolProvider>
  );
}
