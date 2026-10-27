export type OperationMode = 'simulation' | 'live';

export type RoutingStrategy = 'load_balanced' | 'sequential' | 'raid_chunking';

export type TokenHealthStatus = 'Active' | 'Refresh Needed' | 'Revoked';

export type CloudSyncStatus = 'Synced to Cloud DB' | 'Local Offline Cache' | 'Syncing...';

export interface TenantUser {
  userId: string;
  phoneNumber: string; // e.g. +8801711000001
  displayName: string;
  passwordHash: string;
  createdAtIso: string;
  lastLoginIso: string;
}

export interface AccountNode {
  id: string;
  nodeNumber: number;
  email: string;
  alias: string;
  usedGb: number;
  totalGb: number;
  tokenStatus: TokenHealthStatus;
  lastActivityIso: string; // ISO string of last keep-alive or active operation
  unreadCount: number;
  authMethod: 'oauth2' | 'app_password';
  accessToken?: string;
  refreshToken?: string; // Permanent OAuth2 refresh token for background auto-renewal
  tokenExpiresAtMs?: number;
  colorAccent: string;
}

export interface FileChunkAllocation {
  chunkIndex: number;
  chunkName: string; // e.g., archive.tar.zst.part1
  nodeId: string;
  nodeEmail: string;
  sizeGb: number;
  byteOffsetStart?: number;
  byteOffsetEnd?: number;
  driveFileId?: string;
}

export interface VirtualFile {
  id: string;
  name: string;
  folderPath: string; // e.g. "/Backups", "/Media", "/Datasets", "/Archives"
  sizeGb: number;
  exactBytes?: number;
  isRealBinary?: boolean;
  mimeType: string;
  uploadedAtIso: string;
  routingStrategy: RoutingStrategy;
  isChunked: boolean;
  chunks: FileChunkAllocation[];
  checksumSha256: string;
}

export interface UnifiedEmail {
  id: string;
  nodeId: string;
  recipientEmail: string; // Which of the 25+ accounts received it
  senderName: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAtIso: string;
  isUnread: boolean;
  isStarred: boolean;
  extractedOtp: string | null;
  verificationUrl: string | null;
  category: 'OTP & Security' | 'Cloud & Dev' | 'Billing' | 'Personal';
}

export interface HeartbeatLogEntry {
  id: string;
  timestampIso: string;
  nodeId: string;
  nodeLabel: string;
  step: 'AUTH' | 'DRIVE_WRITE' | 'GMAIL_PING' | 'COMPLETE' | 'ERROR';
  message: string;
  status: 'OK' | 'WARN' | 'ERR';
}

export interface ExtensionModule {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  metricsLabel: string;
  configSummary: string;
}

export interface OmniPoolSettings {
  mode: OperationMode;
  googleClientId: string;
  googleClientSecret: string;
  googleApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  lastCloudSyncIso: string;
  heartbeatIntervalDays: 7 | 30 | 90;
  autoHeartbeatEnabled: boolean;
  defaultRoutingStrategy: RoutingStrategy;
  maxChunkSizeGb: number;
  lastGlobalHeartbeatIso: string;
}
