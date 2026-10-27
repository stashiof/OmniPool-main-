// Live Google Identity Services (GIS) + Permanent OAuth2 Refresh Token + Drive v3 Multipart Chunk Upload & Gmail v1 REST Client
import { AccountNode, UnifiedEmail } from '../types/omnipool';
import { extractOtpAndLinks } from './poolEngine';

export interface LiveGoogleNodeProfile {
  email: string;
  usedGb: number;
  totalGb: number;
  unreadCount: number;
  accessToken: string;
  refreshToken?: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };
        };
      };
    };
  }
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Identity script'))
      );
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(script);
  });
}

/**
 * Permanent OAuth2 Refresh Token Exchange Flow:
 * Exchanges a stored permanent `refresh_token` + `client_id` + `client_secret`
 * for a fresh short-lived `access_token` so connected Gmail accounts never expire.
 */
export async function exchangeRefreshTokenForAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  if (!clientId.trim() || !clientSecret.trim() || !refreshToken.trim()) {
    throw new Error(
      'Client ID, Client Secret, and Refresh Token are required for permanent OAuth2 auto-renewal.'
    );
  }

  const body = new URLSearchParams({
    client_id: clientId.trim(),
    client_secret: clientSecret.trim(),
    refresh_token: refreshToken.trim(),
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth2 token refresh failed (HTTP ${res.status}): ${errText.slice(0, 100)}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresInSeconds: Number(data.expires_in || 3600),
  };
}

/**
 * Ensures an AccountNode has a valid access_token, automatically exchanging its
 * permanent `refreshToken` if `clientId` and `clientSecret` are configured.
 */
export async function ensureFreshNodeAccessToken(
  node: AccountNode,
  clientId?: string,
  clientSecret?: string
): Promise<string | undefined> {
  const now = Date.now();
  const isExpired =
    node.tokenExpiresAtMs !== undefined && now >= node.tokenExpiresAtMs - 60_000;

  if (node.accessToken && !isExpired) {
    return node.accessToken;
  }

  if (node.refreshToken && clientId?.trim() && clientSecret?.trim()) {
    try {
      const refreshed = await exchangeRefreshTokenForAccessToken(
        clientId,
        clientSecret,
        node.refreshToken
      );
      return refreshed.accessToken;
    } catch {
      return node.accessToken;
    }
  }

  return node.accessToken;
}

/**
 * Streams a real binary file chunk (`Blob.slice`) directly to a Gmail account's
 * Google Drive v3 using `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
 */
export async function uploadBinaryChunkToDriveV3(
  accessToken: string,
  chunkName: string,
  chunkBlob: Blob,
  mimeType: string = 'application/octet-stream'
): Promise<{ ok: boolean; driveFileId?: string; error?: string }> {
  if (!accessToken.trim()) {
    return { ok: false, error: 'Missing OAuth2 access token for live Drive upload.' };
  }

  try {
    const metadata = {
      name: chunkName,
      mimeType: mimeType || 'application/octet-stream',
      description: 'Uploaded & indexed via OmniPool Virtual Drive Router',
    };

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', chunkBlob, chunkName);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    if (!res.ok) {
      return { ok: false, error: `Drive v3 upload returned HTTP ${res.status}` };
    }

    const json = await res.json();
    return { ok: true, driveFileId: json.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Drive v3 multipart upload error',
    };
  }
}

export async function authenticateGoogleAccountWithClientId(
  clientId: string
): Promise<LiveGoogleNodeProfile> {
  if (!clientId.trim()) {
    throw new Error('Google Cloud OAuth 2.0 Client ID is required for Live API Mode.');
  }
  await loadGoogleIdentityScript();

  const accessToken = await new Promise<string>((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error('Google Identity Services OAuth2 client unavailable.'));
      return;
    }
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope:
        'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
      prompt: 'select_account',
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || 'OAuth token request cancelled.'));
          return;
        }
        resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });

  return fetchLiveNodeProfileWithToken(accessToken);
}

export async function fetchLiveNodeProfileWithToken(
  accessToken: string
): Promise<LiveGoogleNodeProfile> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const driveRes = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress),storageQuota(limit,usage)',
    { headers }
  );
  if (!driveRes.ok) {
    throw new Error(`Drive v3 API returned HTTP ${driveRes.status}`);
  }
  const driveData = await driveRes.json();
  const email = driveData?.user?.emailAddress || 'connected_node@gmail.com';
  const limitBytes = Number(driveData?.storageQuota?.limit || 15 * 1024 ** 3);
  const usageBytes = Number(driveData?.storageQuota?.usage || 0);

  const totalGb = Number((limitBytes / 1024 ** 3).toFixed(2)) || 15;
  const usedGb = Number((usageBytes / 1024 ** 3).toFixed(2)) || 0;

  let unreadCount = 0;
  const gmailRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX',
    { headers }
  );
  if (gmailRes.ok) {
    const labelData = await gmailRes.json();
    unreadCount = Number(labelData?.messagesUnread || 0);
  }

  return {
    email,
    usedGb,
    totalGb,
    unreadCount,
    accessToken,
  };
}

export async function executeLiveNodeHeartbeat(
  node: AccountNode,
  clientId?: string,
  clientSecret?: string
): Promise<{
  driveOk: boolean;
  gmailOk: boolean;
  renewedToken?: string;
}> {
  const token = await ensureFreshNodeAccessToken(node, clientId, clientSecret);
  if (!token) {
    return { driveOk: true, gmailOk: true };
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const [drivePing, gmailPing] = await Promise.allSettled([
    fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {
      headers,
    }),
    fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX', { headers }),
  ]);

  return {
    driveOk: drivePing.status === 'fulfilled' && drivePing.value.ok,
    gmailOk: gmailPing.status === 'fulfilled' && gmailPing.value.ok,
    renewedToken: token !== node.accessToken ? token : undefined,
  };
}

export async function fetchLiveInboxMessagesForNode(
  node: AccountNode,
  clientId?: string,
  clientSecret?: string
): Promise<UnifiedEmail[]> {
  const token = await ensureFreshNodeAccessToken(node, clientId, clientSecret);
  if (!token) return [];
  const headers = { Authorization: `Bearer ${token}` };
  const listRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=label:INBOX',
    { headers }
  );
  if (!listRes.ok) return [];
  const listJson = await listRes.json();
  const messages: Array<{ id: string }> = listJson.messages || [];

  const fetched: UnifiedEmail[] = [];
  for (const msg of messages) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
      { headers }
    );
    if (!detailRes.ok) continue;
    const detail = await detailRes.json();
    const headersList: Array<{ name: string; value: string }> =
      detail?.payload?.headers || [];
    const subject =
      headersList.find((h) => h.name.toLowerCase() === 'subject')?.value ||
      '(No Subject)';
    const fromRaw =
      headersList.find((h) => h.name.toLowerCase() === 'from')?.value ||
      'Unknown Sender';
    const snippet = detail.snippet || '';
    const extracted = extractOtpAndLinks(`${subject} ${snippet}`);

    fetched.push({
      id: `live-${node.id}-${msg.id}`,
      nodeId: node.id,
      recipientEmail: node.email,
      senderName: fromRaw.split('<')[0].trim() || fromRaw,
      senderEmail: fromRaw.match(/<([^>]+)>/)?.[1] || fromRaw,
      subject,
      snippet,
      body: snippet,
      receivedAtIso: new Date(
        Number(detail.internalDate || Date.now())
      ).toISOString(),
      isUnread: (detail.labelIds || []).includes('UNREAD'),
      isStarred: (detail.labelIds || []).includes('STARRED'),
      extractedOtp: extracted.otp,
      verificationUrl: extracted.verificationUrl,
      category: extracted.otp ? 'OTP & Security' : 'Cloud & Dev',
    });
  }
  return fetched;
}
