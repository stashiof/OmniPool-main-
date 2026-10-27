import {
  AccountNode,
  ExtensionModule,
  HeartbeatLogEntry,
  OmniPoolSettings,
  TenantUser,
  UnifiedEmail,
  VirtualFile,
} from '../types/omnipool';
import {
  createInitialEmails,
  createInitialExtensions,
  createInitialHeartbeatLogs,
  createInitialNodes,
  createInitialVirtualFiles,
  INITIAL_SETTINGS,
} from './seedData';

const DB_NAME = 'OmniPoolVaultDB_v3';
const DB_VERSION = 1;
const STORE_NAME = 'omnipool_state_v3';
const LS_FALLBACK_PREFIX = 'omnipool_state_v3_';
const TENANTS_REGISTRY_KEY = 'omnipool_tenants_registry_v3';
const ACTIVE_TENANT_KEY = 'omnipool_active_tenant_v3';
const GLOBAL_SUPABASE_CONFIG_KEY = 'omnipool_global_supabase_v3';

export interface PersistedOmniPoolState {
  nodes: AccountNode[];
  files: VirtualFile[];
  emails: UnifiedEmail[];
  heartbeatLogs: HeartbeatLogEntry[];
  extensions: ExtensionModule[];
  settings: OmniPoolSettings;
}

export interface GlobalSupabaseCredentials {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function sanitizeSupabaseUrl(raw?: string): string {
  const s = (raw || '').trim();
  if (
    !s ||
    !s.startsWith('https://') ||
    s === 'https://your-project-id.supabase.co' ||
    s.startsWith('MY_')
  ) {
    return '';
  }
  return s;
}

function sanitizeSupabaseKey(raw?: string): string {
  const s = (raw || '').trim();
  if (!s || s === 'your-supabase-anon-key' || s.startsWith('MY_') || s.length < 20) {
    return '';
  }
  return s;
}

export function loadGlobalSupabaseConfig(): GlobalSupabaseCredentials {
  const rawEnvUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  const rawEnvKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

  const envUrl = sanitizeSupabaseUrl(rawEnvUrl);
  const envKey = sanitizeSupabaseKey(rawEnvKey);

  try {
    const raw = window.localStorage.getItem(GLOBAL_SUPABASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GlobalSupabaseCredentials>;
      const savedUrl = sanitizeSupabaseUrl(parsed.supabaseUrl);
      const savedKey = sanitizeSupabaseKey(parsed.supabaseAnonKey);
      return {
        supabaseUrl: savedUrl || envUrl,
        supabaseAnonKey: savedKey || envKey,
      };
    }
  } catch {
    // ignore
  }
  return {
    supabaseUrl: envUrl,
    supabaseAnonKey: envKey,
  };
}

export function saveGlobalSupabaseConfig(config: GlobalSupabaseCredentials): void {
  try {
    window.localStorage.setItem(
      GLOBAL_SUPABASE_CONFIG_KEY,
      JSON.stringify({
        supabaseUrl: config.supabaseUrl.trim(),
        supabaseAnonKey: config.supabaseAnonKey.trim(),
      })
    );
  } catch {
    // ignore
  }
}

export function getDefaultState(): PersistedOmniPoolState {
  const globalSb = loadGlobalSupabaseConfig();
  return {
    nodes: createInitialNodes(),
    files: createInitialVirtualFiles(),
    emails: createInitialEmails(),
    heartbeatLogs: createInitialHeartbeatLogs(),
    extensions: createInitialExtensions(),
    settings: {
      ...INITIAL_SETTINGS,
      supabaseUrl: globalSb.supabaseUrl || INITIAL_SETTINGS.supabaseUrl,
      supabaseAnonKey: globalSb.supabaseAnonKey || INITIAL_SETTINGS.supabaseAnonKey,
      lastCloudSyncIso: new Date().toISOString(),
    },
  };
}

export function loadTenantsRegistry(): TenantUser[] {
  try {
    const raw = window.localStorage.getItem(TENANTS_REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TenantUser[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveTenantsRegistry(tenants: TenantUser[]): void {
  try {
    window.localStorage.setItem(TENANTS_REGISTRY_KEY, JSON.stringify(tenants));
  } catch {
    // ignore
  }
}

export function loadActiveTenantSession(): TenantUser | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_TENANT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TenantUser;
      if (parsed && parsed.userId && parsed.phoneNumber) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveActiveTenantSession(user: TenantUser): void {
  try {
    window.localStorage.setItem(ACTIVE_TENANT_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearActiveTenantSession(): void {
  try {
    window.localStorage.removeItem(ACTIVE_TENANT_KEY);
  } catch {
    // ignore
  }
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB open error'));
  });
}

export async function loadPersistedState(userId: string): Promise<PersistedOmniPoolState> {
  const storeKey = `vault_${userId}`;
  const lsKey = `${LS_FALLBACK_PREFIX}${userId}`;
  const globalSb = loadGlobalSupabaseConfig();

  // 1. Try IndexedDB first
  try {
    const db = await openIndexedDb();
    const data = await new Promise<PersistedOmniPoolState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(storeKey);
      req.onsuccess = () => resolve(req.result as PersistedOmniPoolState | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (data && Array.isArray(data.nodes)) {
      return {
        ...data,
        settings: {
          ...INITIAL_SETTINGS,
          ...data.settings,
          supabaseUrl: data.settings?.supabaseUrl || globalSb.supabaseUrl,
          supabaseAnonKey: data.settings?.supabaseAnonKey || globalSb.supabaseAnonKey,
        },
      };
    }
  } catch {
    // Fallback to localStorage below
  }

  // 2. Fallback to localStorage
  try {
    const raw = window.localStorage.getItem(lsKey);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedOmniPoolState;
      if (parsed && Array.isArray(parsed.nodes)) {
        return {
          ...parsed,
          settings: {
            ...INITIAL_SETTINGS,
            ...parsed.settings,
            supabaseUrl: parsed.settings?.supabaseUrl || globalSb.supabaseUrl,
            supabaseAnonKey: parsed.settings?.supabaseAnonKey || globalSb.supabaseAnonKey,
          },
        };
      }
    }
  } catch {
    // Ignore storage read error
  }

  const initial = getDefaultState();
  await savePersistedState(initial, userId);
  return initial;
}

export async function savePersistedState(
  state: PersistedOmniPoolState,
  userId: string
): Promise<void> {
  if (!userId) return;
  const storeKey = `vault_${userId}`;
  const lsKey = `${LS_FALLBACK_PREFIX}${userId}`;

  if (state.settings?.supabaseUrl || state.settings?.supabaseAnonKey) {
    saveGlobalSupabaseConfig({
      supabaseUrl: state.settings.supabaseUrl || '',
      supabaseAnonKey: state.settings.supabaseAnonKey || '',
    });
  }

  try {
    window.localStorage.setItem(lsKey, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }

  try {
    const db = await openIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, storeKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Already saved in localStorage fallback
  }
}

export async function resetPersistedState(userId: string): Promise<PersistedOmniPoolState> {
  const fresh = getDefaultState();
  await savePersistedState(fresh, userId);
  return fresh;
}
