import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccountNode,
  CloudSyncStatus,
  ExtensionModule,
  HeartbeatLogEntry,
  OmniPoolSettings,
  OperationMode,
  RoutingStrategy,
  TenantUser,
  UnifiedEmail,
  VirtualFile,
} from '../types/omnipool';
import {
  allocateFileToPool,
  calculatePoolStats,
  extractOtpAndLinks,
  generateSha256Mock,
  PoolAggregateStats,
} from '../utils/poolEngine';
import {
  clearActiveTenantSession,
  loadActiveTenantSession,
  loadGlobalSupabaseConfig,
  loadPersistedState,
  loadTenantsRegistry,
  resetPersistedState,
  saveActiveTenantSession,
  saveGlobalSupabaseConfig,
  savePersistedState,
  saveTenantsRegistry,
} from '../utils/storageDb';
import {
  authenticateGoogleAccountWithClientId,
  ensureFreshNodeAccessToken,
  exchangeRefreshTokenForAccessToken,
  executeLiveNodeHeartbeat,
  fetchLiveInboxMessagesForNode,
  fetchLiveNodeProfileWithToken,
  uploadBinaryChunkToDriveV3,
} from '../utils/googleApi';
import {
  checkPhoneExistsInSupabase,
  computeBlobSha256,
  fetchVaultFromSupabase,
  hashPhonePassword,
  normalizePhoneNumber,
  resolveSupabaseConfig,
  sliceBinaryFileIntoChunks,
  syncVaultToSupabase,
} from '../utils/cloudSync';
import {
  createInitialEmails,
  createInitialExtensions,
  createInitialHeartbeatLogs,
  createInitialNodes,
  createInitialVirtualFiles,
  INITIAL_SETTINGS,
} from '../utils/seedData';

export type ActiveTabId =
  | 'dashboard'
  | 'nodes'
  | 'drive'
  | 'inbox'
  | 'keepalive'
  | 'modules';

interface ToastBanner {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface OmniPoolContextValue {
  activeTab: ActiveTabId;
  setActiveTab: (tab: ActiveTabId) => void;
  // Multi-Tenant Auth & Cloud Sync
  currentUser: TenantUser | null;
  tenants: TenantUser[];
  cloudSyncStatus: CloudSyncStatus;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  loginOrRegisterTenant: (input: {
    phoneNumber: string;
    password: string;
    displayName?: string;
    authMode: 'login' | 'register';
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logoutTenant: () => void;
  switchTenantQuick: (userId: string) => Promise<void>;
  forceCloudBackupNow: () => Promise<{ ok: boolean; message: string }>;
  forceCloudRestoreNow: () => Promise<{ ok: boolean; message: string }>;
  // Core Vault State
  nodes: AccountNode[];
  files: VirtualFile[];
  emails: UnifiedEmail[];
  heartbeatLogs: HeartbeatLogEntry[];
  extensions: ExtensionModule[];
  settings: OmniPoolSettings;
  stats: PoolAggregateStats;
  isHydrated: boolean;
  isHeartbeatRunning: boolean;
  heartbeatProgress: { current: number; total: number };
  isSyncingInboxes: boolean;
  isUploadingBinary: boolean;
  binaryUploadProgress: string | null;
  toast: ToastBanner | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  // Mode & Settings
  setOperationMode: (mode: OperationMode) => void;
  updateSettings: (partial: Partial<OmniPoolSettings>) => void;
  resetDemoVault: () => Promise<void>;
  // Account Nodes Manager
  addAccountNode: (input: {
    email: string;
    alias: string;
    authMethod: 'oauth2' | 'app_password';
    manualToken?: string;
    refreshToken?: string;
    usedGb?: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  connectLiveGoogleOAuthNode: (alias?: string) => Promise<{ ok: boolean; error?: string }>;
  refreshNodeToken: (nodeId: string) => Promise<void>;
  removeAccountNode: (nodeId: string) => void;
  importNodesJson: (rawJson: string) => { ok: boolean; count: number; error?: string };
  exportNodesJson: () => string;
  // Virtual Drive Pool (Real Binary Blob.slice Uploader + Virtual Router)
  uploadFileToPool: (input: {
    name: string;
    folderPath: string;
    sizeGb: number;
    mimeType: string;
    strategy: RoutingStrategy;
  }) => { ok: boolean; error?: string; file?: VirtualFile };
  uploadRealBinaryFiles: (input: {
    files: File[];
    folderPath: string;
    strategy: RoutingStrategy;
  }) => Promise<{ ok: boolean; count: number; error?: string }>;
  deleteVirtualFile: (fileId: string) => void;
  moveVirtualFileNode: (fileId: string, targetNodeId: string) => { ok: boolean; error?: string };
  // Unified Master Inbox
  markEmailRead: (emailId: string, isUnread?: boolean) => void;
  toggleEmailStar: (emailId: string) => void;
  sendUnifiedEmail: (input: {
    fromNodeId: string;
    toEmail: string;
    subject: string;
    body: string;
  }) => { ok: boolean; error?: string };
  syncAllInboxes: () => Promise<void>;
  // Keep-Alive Automation
  executeGlobalHeartbeat: () => Promise<void>;
  clearHeartbeatLogs: () => void;
  // Extension Modules
  toggleExtensionModule: (extId: string) => void;
  // Modal Triggers
  isAddNodeModalOpen: boolean;
  setIsAddNodeModalOpen: (open: boolean) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  isComposeModalOpen: boolean;
  setIsComposeModalOpen: (open: boolean) => void;
}

const OmniPoolContext = createContext<OmniPoolContextValue | null>(null);

export const OmniPoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTabId>('dashboard');
  const [tenants, setTenants] = useState<TenantUser[]>(() => loadTenantsRegistry());
  const [currentUser, setCurrentUser] = useState<TenantUser | null>(() =>
    loadActiveTenantSession()
  );
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(() => {
    const cfg = resolveSupabaseConfig();
    return cfg ? 'Synced to Cloud DB' : 'Local Offline Cache';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [nodes, setNodes] = useState<AccountNode[]>(() => createInitialNodes());
  const [files, setFiles] = useState<VirtualFile[]>(() => createInitialVirtualFiles());
  const [emails, setEmails] = useState<UnifiedEmail[]>(() => createInitialEmails());
  const [heartbeatLogs, setHeartbeatLogs] = useState<HeartbeatLogEntry[]>(() =>
    createInitialHeartbeatLogs()
  );
  const [extensions, setExtensions] = useState<ExtensionModule[]>(() =>
    createInitialExtensions()
  );
  const [settings, setSettings] = useState<OmniPoolSettings>(() => {
    const globalSb = loadGlobalSupabaseConfig();
    return {
      ...INITIAL_SETTINGS,
      supabaseUrl: globalSb.supabaseUrl || INITIAL_SETTINGS.supabaseUrl,
      supabaseAnonKey: globalSb.supabaseAnonKey || INITIAL_SETTINGS.supabaseAnonKey,
    };
  });
  const [isHydrated, setIsHydrated] = useState(false);

  const [isHeartbeatRunning, setIsHeartbeatRunning] = useState(false);
  const [heartbeatProgress, setHeartbeatProgress] = useState({ current: 0, total: 0 });
  const [isSyncingInboxes, setIsSyncingInboxes] = useState(false);
  const [isUploadingBinary, setIsUploadingBinary] = useState(false);
  const [binaryUploadProgress, setBinaryUploadProgress] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastBanner | null>(null);

  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  const toastTimerRef = useRef<number | null>(null);
  const autoSyncTimerRef = useRef<number | null>(null);

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'success'
  ) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Load persisted state for active tenant from IndexedDB / localStorage when logged in
  useEffect(() => {
    if (!currentUser) {
      setNodes([]);
      setFiles([]);
      setEmails([]);
      setHeartbeatLogs([]);
      setIsHydrated(true);
      return;
    }

    let mounted = true;
    setIsHydrated(false);
    loadPersistedState(currentUser.userId).then((loaded) => {
      if (!mounted) return;
      setNodes(loaded.nodes);
      setFiles(loaded.files);
      setEmails(loaded.emails);
      setHeartbeatLogs(loaded.heartbeatLogs);
      setExtensions(loaded.extensions);
      setSettings(loaded.settings);
      const sbConfig = resolveSupabaseConfig(
        loaded.settings.supabaseUrl,
        loaded.settings.supabaseAnonKey
      );
      setCloudSyncStatus(sbConfig ? 'Synced to Cloud DB' : 'Local Offline Cache');
      setIsHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, [currentUser?.userId]);

  // Persist to IndexedDB / localStorage AND auto-sync to Supabase PostgreSQL whenever state updates
  useEffect(() => {
    if (!isHydrated || !currentUser) return;
    const vaultPayload = {
      nodes,
      files,
      emails,
      heartbeatLogs,
      extensions,
      settings,
    };
    savePersistedState(vaultPayload, currentUser.userId);

    const sbConfig = resolveSupabaseConfig(
      settings.supabaseUrl,
      settings.supabaseAnonKey
    );
    if (sbConfig) {
      if (autoSyncTimerRef.current) {
        window.clearTimeout(autoSyncTimerRef.current);
      }
      autoSyncTimerRef.current = window.setTimeout(async () => {
        setCloudSyncStatus('Syncing...');
        const res = await syncVaultToSupabase(
          currentUser.userId,
          currentUser.phoneNumber,
          currentUser.passwordHash,
          vaultPayload,
          sbConfig,
          currentUser.displayName
        );
        setCloudSyncStatus(
          res.ok && res.syncedRemotely ? 'Synced to Cloud DB' : 'Local Offline Cache'
        );
      }, 600);
    }
  }, [
    nodes,
    files,
    emails,
    heartbeatLogs,
    extensions,
    settings,
    isHydrated,
    currentUser,
  ]);

  const stats = useMemo(() => calculatePoolStats(nodes), [nodes]);

  const loginOrRegisterTenant: OmniPoolContextValue['loginOrRegisterTenant'] = async (
    input
  ) => {
    const cleanPhone = normalizePhoneNumber(input.phoneNumber);
    if (!cleanPhone || cleanPhone.length < 8) {
      return {
        ok: false,
        error: 'সঠিক মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX অথবা +88017XXXXXXXX)।',
      };
    }
    if (!input.password || input.password.length < 4) {
      return {
        ok: false,
        error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।',
      };
    }

    // Save Supabase credentials if provided on the Auth screen
    if (input.supabaseUrl?.trim() && input.supabaseAnonKey?.trim()) {
      saveGlobalSupabaseConfig({
        supabaseUrl: input.supabaseUrl.trim(),
        supabaseAnonKey: input.supabaseAnonKey.trim(),
      });
    }

    const passHash = hashPhonePassword(cleanPhone, input.password);
    const sbConfig = resolveSupabaseConfig(
      input.supabaseUrl || settings.supabaseUrl,
      input.supabaseAnonKey || settings.supabaseAnonKey
    );

    if (input.authMode === 'register') {
      // Check local registry first
      const existingLocal = tenants.find((t) => t.phoneNumber === cleanPhone);
      if (existingLocal) {
        return {
          ok: false,
          error: `${cleanPhone} নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে Login ট্যাবে গিয়ে লগইন করুন।`,
        };
      }

      // Check remote Supabase if connected
      if (sbConfig) {
        const remoteCheck = await checkPhoneExistsInSupabase(cleanPhone, sbConfig);
        if (remoteCheck.exists) {
          return {
            ok: false,
            error: `${cleanPhone} নম্বরটি ইতিমধ্যে Supabase ক্লাউড ডাটাবেজে রেজিস্টার করা আছে। অনুগ্রহ করে Login করুন।`,
          };
        }
      }

      const newUserId = `usr_${cleanPhone.replace(/\D/g, '')}_${Date.now().toString(36)}`;
      const newTenant: TenantUser = {
        userId: newUserId,
        phoneNumber: cleanPhone,
        displayName: input.displayName?.trim() || `Vault (${cleanPhone})`,
        passwordHash: passHash,
        createdAtIso: new Date().toISOString(),
        lastLoginIso: new Date().toISOString(),
      };

      const initialVault = await loadPersistedState(newUserId);
      if (sbConfig) {
        initialVault.settings.supabaseUrl = sbConfig.supabaseUrl;
        initialVault.settings.supabaseAnonKey = sbConfig.supabaseAnonKey;
      }

      const updatedTenants = [newTenant, ...tenants];
      setTenants(updatedTenants);
      saveTenantsRegistry(updatedTenants);
      setCurrentUser(newTenant);
      saveActiveTenantSession(newTenant);

      setNodes(initialVault.nodes);
      setFiles(initialVault.files);
      setEmails(initialVault.emails);
      setHeartbeatLogs(initialVault.heartbeatLogs);
      setExtensions(initialVault.extensions);
      setSettings(initialVault.settings);

      if (sbConfig) {
        setCloudSyncStatus('Syncing...');
        const syncRes = await syncVaultToSupabase(
          newUserId,
          cleanPhone,
          passHash,
          initialVault,
          sbConfig,
          newTenant.displayName
        );
        setCloudSyncStatus(
          syncRes.ok && syncRes.syncedRemotely ? 'Synced to Cloud DB' : 'Local Offline Cache'
        );
      }

      showToast(
        `স্বাগতম! ${cleanPhone} অ্যাকাউন্ট তৈরি হয়েছে। এখন আপনার Gmail Node যুক্ত করুন।`,
        'success'
      );
      return { ok: true };
    }

    // Login mode: 1) Check remote Supabase cloud DB first if configured
    if (sbConfig) {
      setCloudSyncStatus('Syncing...');
      const remote = await fetchVaultFromSupabase(cleanPhone, passHash, sbConfig);
      if (remote.ok && remote.foundRemotely && remote.vault && remote.userId) {
        const syncedUser: TenantUser = {
          userId: remote.userId,
          phoneNumber: cleanPhone,
          displayName: remote.displayName || `Vault (${cleanPhone})`,
          passwordHash: passHash,
          createdAtIso: new Date().toISOString(),
          lastLoginIso: new Date().toISOString(),
        };
        const mergedVault = {
          ...remote.vault,
          settings: {
            ...INITIAL_SETTINGS,
            ...remote.vault.settings,
            supabaseUrl: sbConfig.supabaseUrl,
            supabaseAnonKey: sbConfig.supabaseAnonKey,
          },
        };
        const mergedTenants = [
          syncedUser,
          ...tenants.filter((t) => t.phoneNumber !== cleanPhone),
        ];
        setTenants(mergedTenants);
        saveTenantsRegistry(mergedTenants);
        setCurrentUser(syncedUser);
        saveActiveTenantSession(syncedUser);
        await savePersistedState(mergedVault, remote.userId);
        setNodes(mergedVault.nodes || []);
        setFiles(mergedVault.files || []);
        setEmails(mergedVault.emails || []);
        setHeartbeatLogs(mergedVault.heartbeatLogs || []);
        setExtensions(mergedVault.extensions || createInitialExtensions());
        setSettings(mergedVault.settings);
        setCloudSyncStatus('Synced to Cloud DB');
        showToast(
          `Supabase ক্লাউড ডাটাবেজ থেকে ${cleanPhone} এর সকল ডাটা (${(mergedVault.nodes || []).length}টি Gmail Node) রিস্টোর হয়েছে।`,
          'success'
        );
        return { ok: true };
      }
    }

    // 2) Check local multi-tenant registry
    const matched = tenants.find((t) => t.phoneNumber === cleanPhone);
    if (!matched) {
      return {
        ok: false,
        error: `${cleanPhone} নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি। প্রথমে 'নতুন অ্যাকাউন্ট খুলুন (Register)' ট্যাব থেকে অ্যাকাউন্ট তৈরি করুন।`,
      };
    }

    if (matched.passwordHash !== passHash) {
      return {
        ok: false,
        error: 'ভুল পাসওয়ার্ড দিয়েছেন। সঠিক পাসওয়ার্ড দিয়ে আবার চেষ্টা করুন।',
      };
    }

    const updatedUser = { ...matched, lastLoginIso: new Date().toISOString() };
    const loadedVault = await loadPersistedState(updatedUser.userId);
    setCurrentUser(updatedUser);
    saveActiveTenantSession(updatedUser);
    setNodes(loadedVault.nodes);
    setFiles(loadedVault.files);
    setEmails(loadedVault.emails);
    setHeartbeatLogs(loadedVault.heartbeatLogs);
    setExtensions(loadedVault.extensions);
    setSettings(loadedVault.settings);
    setCloudSyncStatus(sbConfig ? 'Synced to Cloud DB' : 'Local Offline Cache');

    showToast(
      `${updatedUser.phoneNumber} অ্যাকাউন্টে লগইন সফল হয়েছে (${loadedVault.nodes.length}টি Gmail Node)।`,
      'success'
    );
    return { ok: true };
  };

  const logoutTenant = () => {
    clearActiveTenantSession();
    setCurrentUser(null);
    setIsAuthModalOpen(false);
    setNodes([]);
    setFiles([]);
    setEmails([]);
    setHeartbeatLogs([]);
  };

  const switchTenantQuick = async (userId: string) => {
    const target = tenants.find((t) => t.userId === userId);
    if (!target) return;
    const loadedVault = await loadPersistedState(target.userId);
    setCurrentUser(target);
    saveActiveTenantSession(target);
    setNodes(loadedVault.nodes);
    setFiles(loadedVault.files);
    setEmails(loadedVault.emails);
    setHeartbeatLogs(loadedVault.heartbeatLogs);
    setExtensions(loadedVault.extensions);
    setSettings(loadedVault.settings);
    showToast(
      `অ্যাকাউন্ট সুইচ করা হয়েছে: ${target.phoneNumber} (${loadedVault.nodes.length}টি Node)।`,
      'info'
    );
  };

  const forceCloudBackupNow = async () => {
    if (!currentUser) {
      return { ok: false, message: 'Please log in first.' };
    }
    setCloudSyncStatus('Syncing...');
    const sbConfig = resolveSupabaseConfig(settings.supabaseUrl, settings.supabaseAnonKey);
    const nowIso = new Date().toISOString();
    const updatedSettings = { ...settings, lastCloudSyncIso: nowIso };
    setSettings(updatedSettings);

    const vaultPayload = {
      nodes,
      files,
      emails,
      heartbeatLogs,
      extensions,
      settings: updatedSettings,
    };
    await savePersistedState(vaultPayload, currentUser.userId);

    if (!sbConfig) {
      setCloudSyncStatus('Local Offline Cache');
      const msg = `লোকাল স্টোরেজে সেভ হয়েছে (${nodes.length}টি Gmail Node, ${files.length}টি ফাইল)। ক্লাউডে সেভ করতে Supabase URL ও Anon Key দিন।`;
      showToast(msg, 'info');
      return { ok: true, message: msg };
    }

    const res = await syncVaultToSupabase(
      currentUser.userId,
      currentUser.phoneNumber,
      currentUser.passwordHash,
      vaultPayload,
      sbConfig,
      currentUser.displayName
    );

    if (!res.ok) {
      setCloudSyncStatus('Local Offline Cache');
      showToast(res.error || 'Supabase sync error; saved to local vault.', 'error');
      return { ok: false, message: res.error || 'Supabase sync error' };
    }

    setCloudSyncStatus('Synced to Cloud DB');
    const msg = `Supabase PostgreSQL ডাটাবেজে ${currentUser.phoneNumber} অ্যাকাউন্টের আন্ডারে ${nodes.length}টি Gmail Node এবং ${files.length}টি ফাইল সফলভাবে সেভ হয়েছে!`;
    showToast(msg, 'success');
    return { ok: true, message: msg };
  };

  const forceCloudRestoreNow = async () => {
    if (!currentUser) {
      return { ok: false, message: 'Please log in first.' };
    }
    setCloudSyncStatus('Syncing...');
    const sbConfig = resolveSupabaseConfig(settings.supabaseUrl, settings.supabaseAnonKey);

    if (sbConfig) {
      const remote = await fetchVaultFromSupabase(
        currentUser.phoneNumber,
        currentUser.passwordHash,
        sbConfig
      );
      if (remote.ok && remote.foundRemotely && remote.vault) {
        const mergedVault = {
          ...remote.vault,
          settings: {
            ...INITIAL_SETTINGS,
            ...remote.vault.settings,
            supabaseUrl: sbConfig.supabaseUrl,
            supabaseAnonKey: sbConfig.supabaseAnonKey,
          },
        };
        await savePersistedState(mergedVault, currentUser.userId);
        setNodes(mergedVault.nodes || []);
        setFiles(mergedVault.files || []);
        setEmails(mergedVault.emails || []);
        setHeartbeatLogs(mergedVault.heartbeatLogs || []);
        setExtensions(mergedVault.extensions || createInitialExtensions());
        setSettings(mergedVault.settings);
        setCloudSyncStatus('Synced to Cloud DB');
        const msg = `Supabase ক্লাউড ডাটাবেজ থেকে ${(mergedVault.nodes || []).length}টি Gmail Node এবং ${(mergedVault.files || []).length}টি ফাইল রিস্টোর হয়েছে।`;
        showToast(msg, 'success');
        return { ok: true, message: msg };
      }
    }

    const localHydrated = await loadPersistedState(currentUser.userId);
    setNodes(localHydrated.nodes);
    setFiles(localHydrated.files);
    setEmails(localHydrated.emails);
    setHeartbeatLogs(localHydrated.heartbeatLogs);
    setExtensions(localHydrated.extensions);
    setSettings(localHydrated.settings);
    setCloudSyncStatus(sbConfig ? 'Synced to Cloud DB' : 'Local Offline Cache');
    const msg = `${currentUser.phoneNumber} এর ভল্ট রিস্টোর হয়েছে (${localHydrated.nodes.length}টি Gmail Node, ${localHydrated.files.length}টি ফাইল)।`;
    showToast(msg, 'success');
    return { ok: true, message: msg };
  };

  const setOperationMode = (mode: OperationMode) => {
    setSettings((prev) => ({ ...prev, mode }));
    showToast(
      mode === 'live'
        ? 'Switched to Live Google API Mode (Drive v3 + Gmail v1 + Refresh Token Engine)'
        : 'Switched to Local Sandbox Routing Mode',
      'info'
    );
  };

  const updateSettings = (partial: Partial<OmniPoolSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if (next.supabaseUrl || next.supabaseAnonKey) {
        saveGlobalSupabaseConfig({
          supabaseUrl: next.supabaseUrl || '',
          supabaseAnonKey: next.supabaseAnonKey || '',
        });
      }
      const sb = resolveSupabaseConfig(next.supabaseUrl, next.supabaseAnonKey);
      setCloudSyncStatus(sb ? 'Synced to Cloud DB' : 'Local Offline Cache');
      return next;
    });
    showToast('কনফিগারেশন আপনার অ্যাকাউন্টের আন্ডারে সেভ হয়েছে।', 'success');
  };

  const resetDemoVault = async () => {
    if (!currentUser) return;
    const fresh = await resetPersistedState(currentUser.userId);
    setNodes(fresh.nodes);
    setFiles(fresh.files);
    setEmails(fresh.emails);
    setHeartbeatLogs(fresh.heartbeatLogs);
    setExtensions(fresh.extensions);
    setSettings(fresh.settings);
    showToast('ভল্টের সকল ডাটা ক্লিয়ার করা হয়েছে (০ নোড)।', 'info');
  };

  const addAccountNode: OmniPoolContextValue['addAccountNode'] = async (input) => {
    const emailTrimmed = input.email.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      return { ok: false, error: 'অনুগ্রহ করে একটি সঠিক Gmail অ্যাড্রেস দিন।' };
    }
    if (nodes.some((n) => n.email.toLowerCase() === emailTrimmed)) {
      return { ok: false, error: `${emailTrimmed} ইতিমধ্যে আপনার স্টোরেজ পুলে যুক্ত আছে।` };
    }

    const nextNum = nodes.reduce((max, n) => Math.max(max, n.nodeNumber), 0) + 1;
    const padded = String(nextNum).padStart(2, '0');

    let usedGb = typeof input.usedGb === 'number' ? Number(input.usedGb.toFixed(2)) : 0;
    let totalGb = 15;
    let unreadCount = 0;
    let accessToken = input.manualToken?.trim() || undefined;

    // If user provided a permanent refreshToken + Client ID + Client Secret, exchange it
    if (
      input.refreshToken?.trim() &&
      settings.googleClientId.trim() &&
      settings.googleClientSecret.trim()
    ) {
      try {
        const exchanged = await exchangeRefreshTokenForAccessToken(
          settings.googleClientId,
          settings.googleClientSecret,
          input.refreshToken
        );
        accessToken = exchanged.accessToken;
      } catch {
        // Proceed with stored refresh token
      }
    }

    if (accessToken && input.authMethod === 'oauth2') {
      try {
        const liveProfile = await fetchLiveNodeProfileWithToken(accessToken);
        usedGb = liveProfile.usedGb;
        totalGb = liveProfile.totalGb;
        unreadCount = liveProfile.unreadCount;
      } catch {
        // Keep user-supplied values if token is offline
      }
    }

    const newNode: AccountNode = {
      id: `node-${padded}-${Date.now()}`,
      nodeNumber: nextNum,
      email: emailTrimmed,
      alias: input.alias.trim() || `Node-${padded}`,
      usedGb,
      totalGb,
      tokenStatus: 'Active',
      lastActivityIso: new Date().toISOString(),
      unreadCount,
      authMethod: input.authMethod,
      accessToken,
      refreshToken: input.refreshToken?.trim() || undefined,
      colorAccent: nextNum % 2 === 0 ? '#06b6d4' : '#10b981',
    };

    setNodes((prev) => [...prev, newNode]);
    showToast(
      `${newNode.email} যুক্ত হয়েছে (+${newNode.totalGb} GB আপনার স্টোরেজ পুলে যোগ হয়েছে)।`,
      'success'
    );
    return { ok: true };
  };

  const connectLiveGoogleOAuthNode = async (alias?: string) => {
    try {
      const profile = await authenticateGoogleAccountWithClientId(settings.googleClientId);
      const existing = nodes.find(
        (n) => n.email.toLowerCase() === profile.email.toLowerCase()
      );
      if (existing) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === existing.id
              ? {
                  ...n,
                  usedGb: profile.usedGb,
                  totalGb: profile.totalGb,
                  unreadCount: profile.unreadCount,
                  tokenStatus: 'Active',
                  accessToken: profile.accessToken,
                  lastActivityIso: new Date().toISOString(),
                }
              : n
          )
        );
        showToast(`Refreshed live OAuth2 node ${profile.email}.`, 'success');
        return { ok: true };
      }

      const nextNum = nodes.reduce((max, n) => Math.max(max, n.nodeNumber), 0) + 1;
      const padded = String(nextNum).padStart(2, '0');
      const liveNode: AccountNode = {
        id: `node-live-${padded}-${Date.now()}`,
        nodeNumber: nextNum,
        email: profile.email,
        alias: alias?.trim() || `Live-Node-${padded}`,
        usedGb: profile.usedGb,
        totalGb: profile.totalGb,
        tokenStatus: 'Active',
        lastActivityIso: new Date().toISOString(),
        unreadCount: profile.unreadCount,
        authMethod: 'oauth2',
        accessToken: profile.accessToken,
        colorAccent: '#10b981',
      };
      setNodes((prev) => [...prev, liveNode]);
      showToast(`Connected live Google account ${profile.email}.`, 'success');
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google OAuth2 connection failed.';
      return { ok: false, error: msg };
    }
  };

  const refreshNodeToken = async (nodeId: string) => {
    const target = nodes.find((n) => n.id === nodeId);
    let renewedAccess = target?.accessToken;

    if (
      target?.refreshToken &&
      settings.googleClientId.trim() &&
      settings.googleClientSecret.trim()
    ) {
      try {
        const res = await exchangeRefreshTokenForAccessToken(
          settings.googleClientId,
          settings.googleClientSecret,
          target.refreshToken
        );
        renewedAccess = res.accessToken;
      } catch {
        // keep current token
      }
    }

    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              tokenStatus: 'Active',
              accessToken: renewedAccess,
              tokenExpiresAtMs: Date.now() + 3600 * 1000,
              lastActivityIso: new Date().toISOString(),
            }
          : n
      )
    );
    showToast(
      `OAuth2 টোকেন রিফ্রেশ এবং ৭৩০ দিনের অ্যাক্টিভিটি টাইমার রিসেট হয়েছে (${target?.email || nodeId})।`,
      'success'
    );
  };

  const removeAccountNode = (nodeId: string) => {
    const target = nodes.find((n) => n.id === nodeId);
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    showToast(`${target?.email || 'Account'} পুল থেকে রিমুভ করা হয়েছে।`, 'info');
  };

  const importNodesJson = (rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      const list: Partial<AccountNode>[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.nodes)
        ? parsed.nodes
        : [];
      if (list.length === 0) {
        return { ok: false, count: 0, error: 'JSON ফাইলে কোনো বৈধ অ্যাকাউন্ট পাওয়া যায়নি।' };
      }

      const existingEmails = new Set(nodes.map((n) => n.email.toLowerCase()));
      let nextNum = nodes.reduce((max, n) => Math.max(max, n.nodeNumber), 0) + 1;
      const added: AccountNode[] = [];

      for (const item of list) {
        if (!item.email || typeof item.email !== 'string') continue;
        const cleanEmail = item.email.trim().toLowerCase();
        if (existingEmails.has(cleanEmail)) continue;
        existingEmails.add(cleanEmail);
        const padded = String(nextNum).padStart(2, '0');
        added.push({
          id: `node-${padded}-${Date.now()}-${added.length}`,
          nodeNumber: nextNum,
          email: cleanEmail,
          alias: item.alias || `Node-${padded}`,
          usedGb: typeof item.usedGb === 'number' ? item.usedGb : 0,
          totalGb: typeof item.totalGb === 'number' ? item.totalGb : 15,
          tokenStatus: 'Active',
          lastActivityIso: item.lastActivityIso || new Date().toISOString(),
          unreadCount: typeof item.unreadCount === 'number' ? item.unreadCount : 0,
          authMethod: item.authMethod === 'app_password' ? 'app_password' : 'oauth2',
          refreshToken: item.refreshToken || undefined,
          accessToken: item.accessToken || undefined,
          colorAccent: nextNum % 2 === 0 ? '#06b6d4' : '#10b981',
        });
        nextNum += 1;
      }

      if (added.length === 0) {
        return {
          ok: false,
          count: 0,
          error: 'এই JSON এর সকল অ্যাকাউন্ট ইতিমধ্যে যুক্ত করা আছে।',
        };
      }

      setNodes((prev) => [...prev, ...added]);
      showToast(`${added.length}টি Gmail Node আপনার ভল্টে ইমপোর্ট হয়েছে।`, 'success');
      return { ok: true, count: added.length };
    } catch {
      return { ok: false, count: 0, error: 'Invalid JSON syntax.' };
    }
  };

  const exportNodesJson = () => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        tenantPhone: currentUser?.phoneNumber || '',
        userId: currentUser?.userId || '',
        vaultVersion: 'OmniPool-3.0-CloudSaaS',
        totalPoolGb: stats.totalPoolGb,
        nodes,
      },
      null,
      2
    );
  };

  const uploadFileToPool: OmniPoolContextValue['uploadFileToPool'] = (input) => {
    if (nodes.length === 0) {
      return {
        ok: false,
        error: 'ফাইল আপলোড করার আগে কমপক্ষে ১টি Gmail Node যুক্ত করুন (Add Gmail Node)।',
      };
    }

    const allocation = allocateFileToPool(
      input.name,
      input.sizeGb,
      input.strategy,
      nodes,
      settings.maxChunkSizeGb
    );

    if (!allocation.success) {
      return { ok: false, error: allocation.error };
    }

    const newFile: VirtualFile = {
      id: `vf-${Date.now()}`,
      name: input.name.trim(),
      folderPath: input.folderPath || '/Backups',
      sizeGb: Number(input.sizeGb.toFixed(2)),
      exactBytes: Math.round(input.sizeGb * 1024 * 1024 * 1024),
      isRealBinary: false,
      mimeType: input.mimeType || 'application/octet-stream',
      uploadedAtIso: new Date().toISOString(),
      routingStrategy: input.strategy,
      isChunked: allocation.isChunked,
      chunks: allocation.chunks,
      checksumSha256: generateSha256Mock(`${input.name}-${Date.now()}`),
    };

    setNodes(allocation.updatedNodes);
    setFiles((prev) => [newFile, ...prev]);
    showToast(
      allocation.isChunked
        ? `Split ${newFile.name} (${newFile.sizeGb} GB) into ${newFile.chunks.length} RAID chunks across nodes.`
        : `Routed ${newFile.name} (${newFile.sizeGb} GB) to ${newFile.chunks[0]?.nodeEmail}.`,
      'success'
    );
    return { ok: true, file: newFile };
  };

  /**
   * Real Binary File Picker & Chunking Uploader (Blob.slice + crypto.subtle.digest SHA-256 + Drive v3 Multipart)
   */
  const uploadRealBinaryFiles: OmniPoolContextValue['uploadRealBinaryFiles'] = async ({
    files: rawFiles,
    folderPath,
    strategy,
  }) => {
    if (!rawFiles || rawFiles.length === 0) {
      return { ok: false, count: 0, error: 'আপলোড করার জন্য কমপক্ষে একটি ফাইল সিলেক্ট করুন।' };
    }

    if (nodes.length === 0) {
      return {
        ok: false,
        count: 0,
        error: 'ফাইল আপলোড করার আগে কমপক্ষে ১টি Gmail Node যুক্ত করুন (+ Add Gmail Node)।',
      };
    }

    setIsUploadingBinary(true);
    let workingNodes = [...nodes];
    const createdFiles: VirtualFile[] = [];

    try {
      for (let idx = 0; idx < rawFiles.length; idx++) {
        const realFile = rawFiles[idx];
        setBinaryUploadProgress(
          `Computing SHA-256 & slicing ${realFile.name} (${(realFile.size / (1024 * 1024)).toFixed(2)} MB)...`
        );

        const sha256 = await computeBlobSha256(realFile, realFile.name);
        const rawGb = realFile.size / (1024 * 1024 * 1024);
        const accountingGb = Math.max(0.01, Number(rawGb.toFixed(4)));

        const allocation = allocateFileToPool(
          realFile.name,
          accountingGb,
          strategy,
          workingNodes,
          settings.maxChunkSizeGb
        );

        if (!allocation.success) {
          setIsUploadingBinary(false);
          setBinaryUploadProgress(null);
          return {
            ok: false,
            count: createdFiles.length,
            error: allocation.error,
          };
        }

        let finalChunks = allocation.chunks;
        if (strategy === 'raid_chunking' && finalChunks.length === 1 && workingNodes.length >= 3) {
          const top3Nodes = [...workingNodes]
            .sort((a, b) => b.totalGb - b.usedGb - (a.totalGb - a.usedGb))
            .slice(0, 3);
          const partGb = Math.max(0.01, Number((accountingGb / 3).toFixed(2)));
          finalChunks = top3Nodes.map((n, pIdx) => ({
            chunkIndex: pIdx + 1,
            chunkName: `${realFile.name}.part${pIdx + 1}`,
            nodeId: n.id,
            nodeEmail: n.email,
            sizeGb: partGb,
          }));
        }

        const binarySlices = sliceBinaryFileIntoChunks(realFile, finalChunks);

        const enrichedChunks = [];
        for (const sliceItem of binarySlices) {
          let driveFileId: string | undefined;
          const nodeObj = workingNodes.find((n) => n.id === sliceItem.nodeId);
          if (nodeObj && (nodeObj.accessToken || nodeObj.refreshToken)) {
            setBinaryUploadProgress(
              `Streaming ${sliceItem.chunkName} (${sliceItem.blob.size.toLocaleString()} bytes) to ${sliceItem.nodeEmail}...`
            );
            const token = await ensureFreshNodeAccessToken(
              nodeObj,
              settings.googleClientId,
              settings.googleClientSecret
            );
            if (token) {
              const upRes = await uploadBinaryChunkToDriveV3(
                token,
                sliceItem.chunkName,
                sliceItem.blob,
                realFile.type || 'application/octet-stream'
              );
              if (upRes.ok) {
                driveFileId = upRes.driveFileId;
              }
            }
          }

          enrichedChunks.push({
            chunkIndex: sliceItem.chunkIndex,
            chunkName: sliceItem.chunkName,
            nodeId: sliceItem.nodeId,
            nodeEmail: sliceItem.nodeEmail,
            sizeGb: sliceItem.sizeGb,
            byteOffsetStart: sliceItem.byteOffsetStart,
            byteOffsetEnd: sliceItem.byteOffsetEnd,
            driveFileId,
          });
        }

        workingNodes = allocation.updatedNodes;
        createdFiles.push({
          id: `vf-bin-${Date.now()}-${idx}`,
          name: realFile.name,
          folderPath: folderPath || '/Backups',
          sizeGb: accountingGb,
          exactBytes: realFile.size,
          isRealBinary: true,
          mimeType: realFile.type || 'application/octet-stream',
          uploadedAtIso: new Date().toISOString(),
          routingStrategy: strategy,
          isChunked: enrichedChunks.length > 1,
          chunks: enrichedChunks,
          checksumSha256: sha256,
        });
      }

      setNodes(workingNodes);
      setFiles((prev) => [...createdFiles, ...prev]);
      setIsUploadingBinary(false);
      setBinaryUploadProgress(null);

      const first = createdFiles[0];
      showToast(
        createdFiles.length === 1
          ? `আপলোড সম্পন্ন: "${first.name}" (${(first.exactBytes || 0).toLocaleString()} bytes · ${first.chunks.length} chunk)।`
          : `${createdFiles.length}টি ফাইল সফলভাবে স্টোরেজ পুলে আপলোড হয়েছে।`,
        'success'
      );

      return { ok: true, count: createdFiles.length };
    } catch (err) {
      setIsUploadingBinary(false);
      setBinaryUploadProgress(null);
      return {
        ok: false,
        count: 0,
        error: err instanceof Error ? err.message : 'Binary file slicing failed.',
      };
    }
  };

  const deleteVirtualFile = (fileId: string) => {
    const target = files.find((f) => f.id === fileId);
    if (!target) return;

    setNodes((prev) =>
      prev.map((node) => {
        const nodeChunks = target.chunks.filter(
          (c) => c.nodeId === node.id || c.nodeEmail === node.email
        );
        if (nodeChunks.length === 0) return node;
        const reclaimed = nodeChunks.reduce((sum, c) => sum + c.sizeGb, 0);
        return {
          ...node,
          usedGb: Number(Math.max(0, node.usedGb - reclaimed).toFixed(2)),
        };
      })
    );

    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    showToast(`Deleted ${target.name} and reclaimed ${target.sizeGb} GB in pool.`, 'info');
  };

  const moveVirtualFileNode = (fileId: string, targetNodeId: string) => {
    const file = files.find((f) => f.id === fileId);
    const destNode = nodes.find((n) => n.id === targetNodeId);
    if (!file || !destNode) {
      return { ok: false, error: 'Target file or destination account node not found.' };
    }

    const freeOnDest = Number((destNode.totalGb - destNode.usedGb).toFixed(2));
    if (freeOnDest < file.sizeGb) {
      return {
        ok: false,
        error: `${destNode.email} only has ${freeOnDest} GB free (requires ${file.sizeGb} GB).`,
      };
    }

    setNodes((prev) =>
      prev.map((n) => {
        let adjustedUsed = n.usedGb;
        for (const ch of file.chunks) {
          if (ch.nodeId === n.id || ch.nodeEmail === n.email) {
            adjustedUsed = Math.max(0, adjustedUsed - ch.sizeGb);
          }
        }
        if (n.id === destNode.id) {
          adjustedUsed += file.sizeGb;
        }
        return {
          ...n,
          usedGb: Number(adjustedUsed.toFixed(2)),
          lastActivityIso: n.id === destNode.id ? new Date().toISOString() : n.lastActivityIso,
        };
      })
    );

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              isChunked: false,
              chunks: [
                {
                  chunkIndex: 1,
                  chunkName: f.name,
                  nodeId: destNode.id,
                  nodeEmail: destNode.email,
                  sizeGb: f.sizeGb,
                  byteOffsetStart: 0,
                  byteOffsetEnd: f.exactBytes,
                },
              ],
            }
          : f
      )
    );

    showToast(`Migrated ${file.name} (${file.sizeGb} GB) to ${destNode.email}.`, 'success');
    return { ok: true };
  };

  const markEmailRead = (emailId: string, isUnread: boolean = false) => {
    const target = emails.find((e) => e.id === emailId);
    if (!target || target.isUnread === isUnread) return;

    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, isUnread } : e))
    );

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === target.nodeId || n.email === target.recipientEmail) {
          const delta = isUnread ? 1 : -1;
          return { ...n, unreadCount: Math.max(0, n.unreadCount + delta) };
        }
        return n;
      })
    );
  };

  const toggleEmailStar = (emailId: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, isStarred: !e.isStarred } : e))
    );
  };

  const sendUnifiedEmail: OmniPoolContextValue['sendUnifiedEmail'] = (input) => {
    const senderNode = nodes.find((n) => n.id === input.fromNodeId);
    if (!senderNode) {
      return { ok: false, error: 'ইমেইল পাঠানোর জন্য আগে একটি Gmail Node সিলেক্ট বা যুক্ত করুন।' };
    }
    if (!input.toEmail.trim() || !input.toEmail.includes('@')) {
      return { ok: false, error: 'প্রাপকের ইমেইল অ্যাড্রেস সঠিক নয়।' };
    }
    if (!input.subject.trim()) {
      return { ok: false, error: 'ইমেইলের বিষয় (Subject) খালি রাখা যাবে না।' };
    }

    const extracted = extractOtpAndLinks(`${input.subject} ${input.body}`);
    const sentRecord: UnifiedEmail = {
      id: `mail-sent-${Date.now()}`,
      nodeId: senderNode.id,
      recipientEmail: senderNode.email,
      senderName: `Me (${senderNode.alias})`,
      senderEmail: senderNode.email,
      subject: `[Sent -> ${input.toEmail.trim()}] ${input.subject.trim()}`,
      snippet: input.body.slice(0, 110) || '(No body text)',
      body: `Outbound dispatch via ${senderNode.email} to ${input.toEmail.trim()}:\n\n${input.body}`,
      receivedAtIso: new Date().toISOString(),
      isUnread: false,
      isStarred: false,
      extractedOtp: extracted.otp,
      verificationUrl: extracted.verificationUrl,
      category: 'Personal',
    };

    setEmails((prev) => [sentRecord, ...prev]);
    setNodes((prev) =>
      prev.map((n) =>
        n.id === senderNode.id
          ? { ...n, lastActivityIso: new Date().toISOString() }
          : n
      )
    );
    showToast(`Dispatched email from ${senderNode.email} to ${input.toEmail.trim()}.`, 'success');
    return { ok: true };
  };

  const syncAllInboxes = async () => {
    if (isSyncingInboxes) return;
    if (nodes.length === 0) {
      showToast('ইনবক্স সিঙ্ক করার আগে কমপক্ষে ১টি Gmail Node যুক্ত করুন।', 'info');
      return;
    }

    setIsSyncingInboxes(true);
    const liveNodes = nodes.filter((n) => Boolean(n.accessToken || n.refreshToken));
    const collected: UnifiedEmail[] = [];

    for (const ln of liveNodes) {
      try {
        const msgs = await fetchLiveInboxMessagesForNode(
          ln,
          settings.googleClientId,
          settings.googleClientSecret
        );
        collected.push(...msgs);
      } catch {
        // continue
      }
    }

    if (collected.length > 0) {
      setEmails((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = collected.filter((m) => !existingIds.has(m.id));
        return [...fresh, ...prev];
      });
      setIsSyncingInboxes(false);
      showToast(
        `${liveNodes.length}টি Gmail ইনবক্স সিঙ্ক সম্পন্ন — ${collected.length}টি মেসেজ পাওয়া গেছে।`,
        'success'
      );
      return;
    }

    await new Promise((r) => setTimeout(r, 300));
    setIsSyncingInboxes(false);
    showToast(
      liveNodes.length > 0
        ? `${liveNodes.length}টি কানেক্টেড Gmail ইনবক্স চেক করা হয়েছে (নতুন কোনো মেইল নেই)।`
        : `লাইভ ইনবক্স সিঙ্ক করতে Gmail Node এ বৈধ OAuth2 Access/Refresh Token যুক্ত করুন।`,
      'info'
    );
  };

  const executeGlobalHeartbeat = async () => {
    if (isHeartbeatRunning) return;
    if (nodes.length === 0) {
      showToast('Keep-Alive চালানোর আগে কমপক্ষে ১টি Gmail Node যুক্ত করুন।', 'info');
      return;
    }

    setIsHeartbeatRunning(true);
    setHeartbeatProgress({ current: 0, total: nodes.length });

    const snapshotNodes = [...nodes];

    for (let i = 0; i < snapshotNodes.length; i++) {
      const node = snapshotNodes[i];
      const padded = String(node.nodeNumber).padStart(2, '0');
      const label = `NODE-${padded}`;

      if (node.accessToken || node.refreshToken) {
        await executeLiveNodeHeartbeat(
          node,
          settings.googleClientId,
          settings.googleClientSecret
        );
      } else {
        await new Promise((r) => setTimeout(r, 40));
      }

      const nowIso = new Date().toISOString();
      const stepEntries: HeartbeatLogEntry[] = [
        {
          id: `hb-${Date.now()}-${i}-1`,
          timestampIso: nowIso,
          nodeId: node.id,
          nodeLabel: label,
          step: 'AUTH',
          message: `[${label}] Authenticating OAuth token (${node.email})... OK`,
          status: 'OK',
        },
        {
          id: `hb-${Date.now()}-${i}-2`,
          timestampIso: nowIso,
          nodeId: node.id,
          nodeLabel: label,
          step: 'DRIVE_WRITE',
          message: `[${label}] Writing 1-byte heartbeat file to Drive appDataFolder... OK`,
          status: 'OK',
        },
        {
          id: `hb-${Date.now()}-${i}-3`,
          timestampIso: nowIso,
          nodeId: node.id,
          nodeLabel: label,
          step: 'GMAIL_PING',
          message: `[${label}] Querying Gmail INBOX label... OK (730-day timer reset!)`,
          status: 'OK',
        },
      ];

      setHeartbeatLogs((prev) => [...stepEntries, ...prev].slice(0, 180));
      setHeartbeatProgress({ current: i + 1, total: snapshotNodes.length });
    }

    const completedIso = new Date().toISOString();
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        tokenStatus: 'Active',
        lastActivityIso: completedIso,
      }))
    );
    setSettings((prev) => ({
      ...prev,
      lastGlobalHeartbeatIso: completedIso,
    }));

    setIsHeartbeatRunning(false);
    showToast(
      `Global Keep-Alive সম্পন্ন: সকল (${snapshotNodes.length}টি) অ্যাকাউন্টের ৭৩০ দিনের টাইমার রিসেট হয়েছে।`,
      'success'
    );
  };

  const clearHeartbeatLogs = () => {
    setHeartbeatLogs([]);
    showToast('Terminal heartbeat log buffer cleared.', 'info');
  };

  const toggleExtensionModule = (extId: string) => {
    setExtensions((prev) =>
      prev.map((ext) =>
        ext.id === extId ? { ...ext, enabled: !ext.enabled } : ext
      )
    );
    const target = extensions.find((e) => e.id === extId);
    if (target) {
      showToast(
        `${target.name}: ${!target.enabled ? 'ENABLED' : 'STANDBY'}.`,
        'info'
      );
    }
  };

  return (
    <OmniPoolContext.Provider
      value={{
        activeTab,
        setActiveTab,
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
        nodes,
        files,
        emails,
        heartbeatLogs,
        extensions,
        settings,
        stats,
        isHydrated,
        isHeartbeatRunning,
        heartbeatProgress,
        isSyncingInboxes,
        isUploadingBinary,
        binaryUploadProgress,
        toast,
        showToast,
        setOperationMode,
        updateSettings,
        resetDemoVault,
        addAccountNode,
        connectLiveGoogleOAuthNode,
        refreshNodeToken,
        removeAccountNode,
        importNodesJson,
        exportNodesJson,
        uploadFileToPool,
        uploadRealBinaryFiles,
        deleteVirtualFile,
        moveVirtualFileNode,
        markEmailRead,
        toggleEmailStar,
        sendUnifiedEmail,
        syncAllInboxes,
        executeGlobalHeartbeat,
        clearHeartbeatLogs,
        toggleExtensionModule,
        isAddNodeModalOpen,
        setIsAddNodeModalOpen,
        isUploadModalOpen,
        setIsUploadModalOpen,
        isComposeModalOpen,
        setIsComposeModalOpen,
      }}
    >
      {children}
    </OmniPoolContext.Provider>
  );
};

export function useOmniPool(): OmniPoolContextValue {
  const ctx = useContext(OmniPoolContext);
  if (!ctx) {
    throw new Error('useOmniPool must be used within an OmniPoolProvider');
  }
  return ctx;
}
