import {
  AccountNode,
  ExtensionModule,
  HeartbeatLogEntry,
  OmniPoolSettings,
  UnifiedEmail,
  VirtualFile,
} from '../types/omnipool';

export function createInitialNodes(): AccountNode[] {
  return [];
}

export function createInitialVirtualFiles(): VirtualFile[] {
  return [];
}

export function createInitialEmails(): UnifiedEmail[] {
  return [];
}

export function createInitialHeartbeatLogs(): HeartbeatLogEntry[] {
  return [];
}

export function createInitialExtensions(): ExtensionModule[] {
  return [
    {
      id: 'ext-api-rotator',
      name: 'API Quota Rotator & Round-Robin Proxy',
      category: 'Traffic Routing',
      description:
        'Automatically load-balances Google Drive v3 uploads and downloads across all connected OAuth tokens to bypass per-account 750GB/day & 10,000 req/min rate limits.',
      enabled: true,
      metricsLabel: 'Multi-Node Round-Robin',
      configSummary: 'Round-Robin + Exponential Backoff active',
    },
    {
      id: 'ext-gemini-pooler',
      name: 'Google Colab & API Key Pooler',
      category: 'Compute & Quota',
      description:
        'Aggregates quota across your connected Google accounts into a unified load-balanced endpoint with automatic failover.',
      enabled: true,
      metricsLabel: 'Pooled Quota Router',
      configSummary: 'Auto-failover on HTTP 429 Too Many Requests',
    },
    {
      id: 'ext-raid-parity',
      name: 'Reed-Solomon Parity Shard Engine',
      category: 'Storage Resilience',
      description:
        'Adds parity verification across split binary file chunks across distinct Gmail accounts so virtual files remain recoverable.',
      enabled: false,
      metricsLabel: 'RAID-5 N+1 Redundancy',
      configSummary: '20% storage overhead when active',
    },
    {
      id: 'ext-auto-backup',
      name: 'Encrypted Rclone WebDAV Bridge',
      category: 'Backup Sync',
      description:
        'Exposes your virtual Drive pool as a client-side AES-256-GCM encrypted mount point compatible with rclone and restic.',
      enabled: true,
      metricsLabel: 'AES-256-GCM Client-Side',
      configSummary: 'Filename + chunk checksum verification enabled',
    },
    {
      id: 'ext-otp-webhook',
      name: 'Real-Time OTP Webhook Forwarder',
      category: 'SecOps Automation',
      description:
        'Streams extracted 4–8 digit OTP codes from all connected Gmail inboxes to your webhook endpoint upon arrival.',
      enabled: false,
      metricsLabel: 'Real-time OTP Parser',
      configSummary: 'Regex + Heuristic link parser standby',
    },
  ];
}

const rawEnvUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const rawEnvKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

export const INITIAL_SETTINGS: OmniPoolSettings = {
  mode: 'live',
  googleClientId: '',
  googleClientSecret: '',
  googleApiKey: '',
  supabaseUrl:
    rawEnvUrl === 'https://your-project-id.supabase.co' ? '' : rawEnvUrl.trim(),
  supabaseAnonKey: rawEnvKey === 'your-supabase-anon-key' ? '' : rawEnvKey.trim(),
  lastCloudSyncIso: new Date().toISOString(),
  heartbeatIntervalDays: 30,
  autoHeartbeatEnabled: true,
  defaultRoutingStrategy: 'load_balanced',
  maxChunkSizeGb: 10,
  lastGlobalHeartbeatIso: new Date().toISOString(),
};
