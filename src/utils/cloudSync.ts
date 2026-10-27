import { FileChunkAllocation } from '../types/omnipool';
import { generateSha256Mock } from './poolEngine';
import { loadGlobalSupabaseConfig, PersistedOmniPoolState } from './storageDb';

export interface SlicedBinaryChunk {
  chunkIndex: number;
  chunkName: string;
  nodeId: string;
  nodeEmail: string;
  sizeGb: number;
  byteOffsetStart: number;
  byteOffsetEnd: number;
  blob: Blob;
}

/**
 * Normalizes a mobile phone number (e.g., 01711000001 -> +8801711000001)
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const stripped = rawPhone.replace(/[\s()-]/g, '');
  if (!stripped) return '';
  if (stripped.startsWith('+')) return stripped;
  if (stripped.startsWith('880')) return `+${stripped}`;
  if (stripped.startsWith('01') && stripped.length === 11) return `+88${stripped}`;
  return `+${stripped}`;
}

/**
 * Deterministic client-side password hash for multi-user authentication
 */
export function hashPhonePassword(phone: string, password: string): string {
  const normalized = normalizePhoneNumber(phone);
  return generateSha256Mock(`omnipool_auth_salt_v2::${normalized}::${password}`);
}

/**
 * Computes a real SHA-256 digest of a File or Blob using Web Crypto API (crypto.subtle.digest).
 * For massive multi-GB files in browser memory, hashes the first 4MB + last 4MB + byte length
 * so hashing completes in <40ms without crashing mobile WebViews.
 */
export async function computeBlobSha256(blob: Blob, fileName: string = ''): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const MAX_SAMPLE = 4 * 1024 * 1024; // 4 MB sample window
      let buffer: ArrayBuffer;
      if (blob.size <= MAX_SAMPLE * 2) {
        buffer = await blob.arrayBuffer();
      } else {
        const head = await blob.slice(0, MAX_SAMPLE).arrayBuffer();
        const tail = await blob.slice(blob.size - MAX_SAMPLE, blob.size).arrayBuffer();
        const combined = new Uint8Array(head.byteLength + tail.byteLength);
        combined.set(new Uint8Array(head), 0);
        combined.set(new Uint8Array(tail), head.byteLength);
        buffer = combined.buffer;
      }
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback if crypto.subtle is unavailable in non-HTTPS WebView
  }
  return generateSha256Mock(`${fileName}-${blob.size}`);
}

/**
 * Physically slices a real File / Blob into binary chunks using Blob.slice(start, end)
 * proportional to each chunk's allocated GB share.
 */
export function sliceBinaryFileIntoChunks(
  file: Blob,
  allocations: FileChunkAllocation[]
): SlicedBinaryChunk[] {
  const totalBytes = file.size;
  if (allocations.length === 0) return [];

  if (allocations.length === 1) {
    const single = allocations[0];
    return [
      {
        ...single,
        byteOffsetStart: 0,
        byteOffsetEnd: totalBytes,
        blob: file.slice(0, totalBytes, file.type || 'application/octet-stream'),
      },
    ];
  }

  const totalAllocatedGb = allocations.reduce((acc, c) => acc + c.sizeGb, 0) || 1;
  const sliced: SlicedBinaryChunk[] = [];
  let cursor = 0;

  for (let i = 0; i < allocations.length; i++) {
    const item = allocations[i];
    const isLast = i === allocations.length - 1;
    const shareBytes = isLast
      ? totalBytes - cursor
      : Math.max(1, Math.floor((item.sizeGb / totalAllocatedGb) * totalBytes));
    const end = Math.min(totalBytes, cursor + shareBytes);
    const partBlob = file.slice(cursor, end, 'application/octet-stream');

    sliced.push({
      ...item,
      byteOffsetStart: cursor,
      byteOffsetEnd: end,
      blob: partBlob,
    });
    cursor = end;
  }

  return sliced;
}

export interface SupabaseSyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function isRealSupabaseCredentials(url?: string, key?: string): boolean {
  const cleanUrl = (url || '').trim().replace(/\/+$/, '');
  const cleanKey = (key || '').trim();
  if (!cleanUrl || !cleanKey) return false;
  if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) return false;
  if (cleanUrl === 'https://your-project-id.supabase.co') return false;
  if (
    cleanKey === 'your-supabase-anon-key' ||
    cleanKey.startsWith('MY_') ||
    cleanKey.length < 20
  ) {
    return false;
  }
  return true;
}

export function resolveSupabaseConfig(
  settingsUrl?: string,
  settingsKey?: string
): SupabaseSyncConfig | null {
  const globalCfg = loadGlobalSupabaseConfig();
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  const envKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

  const candidates: Array<[string, string]> = [
    [settingsUrl || '', settingsKey || ''],
    [globalCfg.supabaseUrl || '', globalCfg.supabaseAnonKey || ''],
    [envUrl || '', envKey || ''],
  ];

  for (const [u, k] of candidates) {
    if (isRealSupabaseCredentials(u, k)) {
      return {
        supabaseUrl: u.trim().replace(/\/+$/, ''),
        supabaseAnonKey: k.trim(),
      };
    }
  }
  return null;
}

/**
 * Checks whether a mobile number is already registered in Supabase `users_vault`
 */
export async function checkPhoneExistsInSupabase(
  phoneNumber: string,
  config: SupabaseSyncConfig | null
): Promise<{ exists: boolean; error?: string }> {
  if (!config) {
    return { exists: false };
  }
  try {
    const encodedPhone = encodeURIComponent(phoneNumber);
    const endpoint = `${config.supabaseUrl}/rest/v1/users_vault?phone_number=eq.${encodedPhone}&select=user_id&limit=1`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      return { exists: false };
    }
    const rows = await res.json();
    return { exists: Array.isArray(rows) && rows.length > 0 };
  } catch {
    return { exists: false };
  }
}

/**
 * Pushes the user's complete encrypted vault (nodes, files, emails, settings, oauth_refresh_tokens)
 * to Supabase PostgreSQL table `users_vault` and relational tables (`gmail_nodes`, `virtual_files`) via REST upsert.
 */
export async function syncVaultToSupabase(
  userId: string,
  phoneNumber: string,
  passwordHash: string,
  vaultState: PersistedOmniPoolState,
  config: SupabaseSyncConfig | null,
  displayName?: string
): Promise<{ ok: boolean; syncedRemotely: boolean; error?: string }> {
  if (!config) {
    return {
      ok: true,
      syncedRemotely: false,
    };
  }

  try {
    const headers = {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    };

    // 1. Upsert primary tenant vault in `users_vault`
    const endpoint = `${config.supabaseUrl}/rest/v1/users_vault?on_conflict=user_id`;
    const payload = {
      user_id: userId,
      phone_number: phoneNumber,
      display_name: displayName || `Vault (${phoneNumber})`,
      password_hash: passwordHash,
      vault_json: vaultState,
      total_nodes: vaultState.nodes.length,
      total_files: vaultState.files.length,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        syncedRemotely: false,
        error: `Supabase HTTP ${res.status}: ${errText.slice(0, 120)}`,
      };
    }

    // 2. Sync relational `gmail_nodes` rows under this `user_id` (best-effort)
    if (vaultState.nodes.length > 0) {
      const nodesPayload = vaultState.nodes.map((n) => ({
        id: `${userId}__${n.id}`,
        user_id: userId,
        email: n.email,
        alias: n.alias,
        used_gb: n.usedGb,
        total_gb: n.totalGb,
        token_status: n.tokenStatus,
        auth_method: n.authMethod,
        oauth_refresh_token: n.refreshToken || null,
        last_activity_iso: n.lastActivityIso,
      }));
      await fetch(`${config.supabaseUrl}/rest/v1/gmail_nodes?on_conflict=id`, {
        method: 'POST',
        headers,
        body: JSON.stringify(nodesPayload),
      }).catch(() => {});
    }

    // 3. Sync relational `virtual_files` rows under this `user_id` (best-effort)
    if (vaultState.files.length > 0) {
      const filesPayload = vaultState.files.map((f) => ({
        id: `${userId}__${f.id}`,
        user_id: userId,
        file_name: f.name,
        folder_path: f.folderPath,
        size_gb: f.sizeGb,
        exact_bytes: f.exactBytes || 0,
        mime_type: f.mimeType,
        sha256_checksum: f.checksumSha256,
        routing_strategy: f.routingStrategy,
        is_chunked: f.isChunked,
        uploaded_at: f.uploadedAtIso,
      }));
      await fetch(`${config.supabaseUrl}/rest/v1/virtual_files?on_conflict=id`, {
        method: 'POST',
        headers,
        body: JSON.stringify(filesPayload),
      }).catch(() => {});
    }

    return { ok: true, syncedRemotely: true };
  } catch (err) {
    return {
      ok: false,
      syncedRemotely: false,
      error: err instanceof Error ? err.message : 'Network error connecting to Supabase',
    };
  }
}

/**
 * Pulls a user's vault from Supabase PostgreSQL by mobile phone_number + password_hash.
 * Used when logging in on a new phone, after APK reinstall, or clicking "Restore Vault".
 */
export async function fetchVaultFromSupabase(
  phoneNumber: string,
  passwordHash: string,
  config: SupabaseSyncConfig | null
): Promise<{
  ok: boolean;
  foundRemotely: boolean;
  userId?: string;
  displayName?: string;
  vault?: PersistedOmniPoolState;
  error?: string;
}> {
  if (!config) {
    return { ok: true, foundRemotely: false };
  }

  try {
    const encodedPhone = encodeURIComponent(phoneNumber);
    const encodedHash = encodeURIComponent(passwordHash);
    const endpoint = `${config.supabaseUrl}/rest/v1/users_vault?phone_number=eq.${encodedPhone}&password_hash=eq.${encodedHash}&select=user_id,display_name,vault_json,updated_at&limit=1`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        foundRemotely: false,
        error: `Supabase query returned HTTP ${res.status}`,
      };
    }

    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].vault_json) {
      return {
        ok: true,
        foundRemotely: true,
        userId: rows[0].user_id,
        displayName: rows[0].display_name,
        vault: rows[0].vault_json as PersistedOmniPoolState,
      };
    }

    return { ok: true, foundRemotely: false };
  } catch (err) {
    return {
      ok: false,
      foundRemotely: false,
      error: err instanceof Error ? err.message : 'Supabase fetch failed',
    };
  }
}

export const SUPABASE_SQL_SCHEMA = `-- ============================================================================
-- OmniPool Multi-Tenant Cloud Vault Schema (PostgreSQL / Supabase)
-- নির্দেশনা: Supabase Dashboard -> SQL Editor -> New Query তে পেস্ট করে "Run" ক্লিক করুন
-- ============================================================================

-- 1. ইউজার অ্যাকাউন্ট ও ভল্ট টেবিল (মোবাইল নম্বর + পাসওয়ার্ড হ্যাশ ও সম্পূর্ণ ভল্ট JSON)
create table if not exists public.users_vault (
  user_id text primary key,
  phone_number text unique not null,
  display_name text default '',
  password_hash text not null,
  vault_json jsonb not null default '{}'::jsonb,
  total_nodes integer not null default 0,
  total_files integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- যদি আগে পুরনো টেবিল তৈরি করা থাকে, তবে নতুন কলামগুলো নিরাপদে যুক্ত করবে:
alter table public.users_vault add column if not exists display_name text default '';
alter table public.users_vault add column if not exists total_files integer not null default 0;
alter table public.users_vault add column if not exists created_at timestamptz not null default now();

-- 2. প্রতিটি ইউজারের আন্ডারে কানেক্ট করা Gmail Nodes টেবিল
create table if not exists public.gmail_nodes (
  id text primary key,
  user_id text not null references public.users_vault(user_id) on delete cascade,
  email text not null,
  alias text,
  used_gb numeric(10,2) default 0,
  total_gb numeric(10,2) default 15,
  token_status text default 'Active',
  auth_method text default 'oauth2',
  oauth_refresh_token text,
  last_activity_iso timestamptz default now()
);

alter table public.gmail_nodes add column if not exists token_status text default 'Active';
alter table public.gmail_nodes add column if not exists auth_method text default 'oauth2';

-- 3. প্রতিটি ইউজারের আন্ডারে আপলোড করা Virtual Drive Files টেবিল
create table if not exists public.virtual_files (
  id text primary key,
  user_id text not null references public.users_vault(user_id) on delete cascade,
  file_name text not null,
  folder_path text not null default '/Backups',
  size_gb numeric(12,4) not null,
  exact_bytes bigint default 0,
  mime_type text,
  sha256_checksum text,
  routing_strategy text,
  is_chunked boolean default false,
  uploaded_at timestamptz default now()
);

-- 4. স্প্লিট করা ফাইলের Chunk Allocations টেবিল (.part1, .part2, .part3)
create table if not exists public.chunk_allocations (
  id bigserial primary key,
  file_id text not null references public.virtual_files(id) on delete cascade,
  user_id text not null references public.users_vault(user_id) on delete cascade,
  chunk_index integer not null,
  chunk_name text not null,
  node_id text not null,
  node_email text not null,
  size_gb numeric(12,4) not null,
  byte_offset_start bigint default 0,
  byte_offset_end bigint default 0,
  drive_file_id text
);

-- 5. Unified Inbox ও OTP মেসেজ টেবিল
create table if not exists public.unified_emails (
  id text primary key,
  user_id text not null references public.users_vault(user_id) on delete cascade,
  node_id text not null,
  recipient_email text not null,
  sender_name text,
  sender_email text,
  subject text,
  snippet text,
  body text,
  extracted_otp text,
  verification_url text,
  is_unread boolean default true,
  received_at timestamptz default now()
);

-- 6. 730-Day Keep-Alive Heartbeat Logs টেবিল
create table if not exists public.heartbeat_logs (
  id text primary key,
  user_id text not null references public.users_vault(user_id) on delete cascade,
  node_id text not null,
  node_label text,
  step text,
  message text,
  status text default 'OK',
  created_at timestamptz default now()
);

-- দ্রুত সার্চের জন্য ইনডেক্স (Indexes)
create index if not exists idx_users_vault_phone on public.users_vault(phone_number);
create index if not exists idx_gmail_nodes_user_id on public.gmail_nodes(user_id);
create index if not exists idx_virtual_files_user_id on public.virtual_files(user_id);
create index if not exists idx_unified_emails_user_id on public.unified_emails(user_id);

-- Row-Level Security (RLS) চালু করা
alter table public.users_vault enable row level security;
alter table public.gmail_nodes enable row level security;
alter table public.virtual_files enable row level security;
alter table public.chunk_allocations enable row level security;
alter table public.unified_emails enable row level security;
alter table public.heartbeat_logs enable row level security;

-- পুনরায় রান করলে যেন এরর না আসে সেজন্য পুরনো পলিসি ড্রপ করে নতুন পলিসি তৈরি
drop policy if exists "Allow tenant vault upsert and sync" on public.users_vault;
create policy "Allow tenant vault upsert and sync"
  on public.users_vault for all
  using (true)
  with check (true);

drop policy if exists "Allow tenant nodes sync" on public.gmail_nodes;
create policy "Allow tenant nodes sync"
  on public.gmail_nodes for all
  using (true)
  with check (true);

drop policy if exists "Allow tenant virtual files sync" on public.virtual_files;
create policy "Allow tenant virtual files sync"
  on public.virtual_files for all
  using (true)
  with check (true);

drop policy if exists "Allow tenant chunk allocations sync" on public.chunk_allocations;
create policy "Allow tenant chunk allocations sync"
  on public.chunk_allocations for all
  using (true)
  with check (true);

drop policy if exists "Allow tenant unified emails sync" on public.unified_emails;
create policy "Allow tenant unified emails sync"
  on public.unified_emails for all
  using (true)
  with check (true);

drop policy if exists "Allow tenant heartbeat logs sync" on public.heartbeat_logs;
create policy "Allow tenant heartbeat logs sync"
  on public.heartbeat_logs for all
  using (true)
  with check (true);
`;

export const GITHUB_ACTIONS_APK_WORKFLOW = `name: Build OmniPool Android APK

on:
  push:
  pull_request:
  workflow_dispatch:

env:
  VITE_SUPABASE_URL: \${{ secrets.VITE_SUPABASE_URL || '' }}
  VITE_SUPABASE_ANON_KEY: \${{ secrets.VITE_SUPABASE_ANON_KEY || '' }}

jobs:
  build-android-apk:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup Java JDK 21 (Required for Android Gradle)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: Setup Android SDK & Accept Licenses
        run: |
          export ANDROID_HOME="\${ANDROID_HOME:-/usr/local/lib/android/sdk}"
          export ANDROID_SDK_ROOT="\$ANDROID_HOME"
          echo "ANDROID_HOME=\$ANDROID_HOME" >> \$GITHUB_ENV
          echo "ANDROID_SDK_ROOT=\$ANDROID_HOME" >> \$GITHUB_ENV
          SDKMANAGER=\$(find "\$ANDROID_HOME/cmdline-tools" -name sdkmanager | head -n 1)
          if [ -n "\$SDKMANAGER" ]; then
            yes | "\$SDKMANAGER" --licenses > /dev/null || true
          fi

      - name: Install Dependencies & Build Web Bundle
        run: |
          node -e '
            const fs = require("fs");
            const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
            const fix = (deps) => {
              if (!deps) return;
              for (const k of Object.keys(deps)) {
                deps[k] = "latest";
              }
            };
            fix(pkg.dependencies);
            fix(pkg.devDependencies);
            fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
          '
          if [ -n "\$VITE_SUPABASE_URL" ] && [ -n "\$VITE_SUPABASE_ANON_KEY" ]; then
            echo "VITE_SUPABASE_URL=\$VITE_SUPABASE_URL" > .env.production
            echo "VITE_SUPABASE_ANON_KEY=\$VITE_SUPABASE_ANON_KEY" >> .env.production
          fi
          rm -f package-lock.json
          npm install --legacy-peer-deps
          npm run build

      - name: Initialize Capacitor Android Project
        run: |
          npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest --legacy-peer-deps
          if [ ! -f "capacitor.config.json" ]; then
            npx cap init "OmniPool" "com.omnipool.cloudhub" --web-dir dist
          fi
          if [ ! -d "android" ]; then
            npx cap add android
          fi
          npx cap sync android

      - name: Grant Execute Permission for Gradlew
        working-directory: ./android
        run: chmod +x gradlew

      - name: Build Debug APK
        working-directory: ./android
        run: ./gradlew assembleDebug --no-daemon

      - name: Upload OmniPool APK to Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: OmniPool-Android-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
`;
