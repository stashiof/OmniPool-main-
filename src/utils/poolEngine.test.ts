import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateInactivityDaysRemaining,
  calculatePoolStats,
  allocateFileToPool,
  extractOtpAndLinks,
} from './poolEngine';
import {
  normalizePhoneNumber,
  hashPhonePassword,
  sliceBinaryFileIntoChunks,
  computeBlobSha256,
} from './cloudSync';
import { AccountNode } from '../types/omnipool';

const sampleNodes: AccountNode[] = [
  {
    id: 'node-1',
    nodeNumber: 1,
    email: 'node_01@gmail.com',
    alias: 'Core-1',
    usedGb: 5,
    totalGb: 15,
    tokenStatus: 'Active',
    lastActivityIso: '2026-10-20T12:00:00.000Z',
    unreadCount: 3,
    authMethod: 'oauth2',
    colorAccent: '#10b981',
  },
  {
    id: 'node-2',
    nodeNumber: 2,
    email: 'node_02@gmail.com',
    alias: 'Core-2',
    usedGb: 1,
    totalGb: 15,
    tokenStatus: 'Active',
    lastActivityIso: '2026-10-25T12:00:00.000Z',
    unreadCount: 1,
    authMethod: 'oauth2',
    colorAccent: '#06b6d4',
  },
  {
    id: 'node-3',
    nodeNumber: 3,
    email: 'node_03@gmail.com',
    alias: 'Core-3',
    usedGb: 3,
    totalGb: 15,
    tokenStatus: 'Refresh Needed',
    lastActivityIso: '2026-10-22T12:00:00.000Z',
    unreadCount: 0,
    authMethod: 'oauth2',
    colorAccent: '#10b981',
  },
];

test('calculatePoolStats aggregates total, used, free storage and token counts accurately', () => {
  const nowMs = new Date('2026-10-26T12:00:00.000Z').getTime();
  const stats = calculatePoolStats(sampleNodes, nowMs);

  assert.equal(stats.totalNodes, 3);
  assert.equal(stats.activeTokens, 2);
  assert.equal(stats.refreshNeededTokens, 1);
  assert.equal(stats.totalPoolGb, 45);
  assert.equal(stats.usedPoolGb, 9);
  assert.equal(stats.freePoolGb, 36);
  assert.equal(stats.usagePercent, 20);
  assert.equal(stats.totalUnreadEmails, 4);
  assert.equal(stats.atRiskNodesCount, 0);
});

test('calculateInactivityDaysRemaining computes 730-day countdown accurately', () => {
  const nowMs = new Date('2026-10-26T12:00:00.000Z').getTime();
  const daysLeft = calculateInactivityDaysRemaining('2026-10-16T12:00:00.000Z', nowMs);
  assert.equal(daysLeft, 720);
});

test('allocateFileToPool routes to node with most free space in load_balanced mode', () => {
  const res = allocateFileToPool('backup.zip', 4, 'load_balanced', sampleNodes);
  assert.equal(res.success, true);
  assert.equal(res.isChunked, false);
  assert.equal(res.chunks.length, 1);
  assert.equal(res.chunks[0].nodeEmail, 'node_02@gmail.com');
  const updatedNode2 = res.updatedNodes.find((n) => n.id === 'node-2');
  assert.equal(updatedNode2?.usedGb, 5);
});

test('allocateFileToPool routes to first sequential node with enough space in sequential mode', () => {
  const res = allocateFileToPool('dataset.parquet', 6, 'sequential', sampleNodes);
  assert.equal(res.success, true);
  assert.equal(res.isChunked, false);
  assert.equal(res.chunks.length, 1);
  assert.equal(res.chunks[0].nodeEmail, 'node_01@gmail.com');
});

test('allocateFileToPool splits large 25GB archive into .part1, .part2, .part3 chunks across multiple Gmail accounts', () => {
  const res = allocateFileToPool(
    'master_cluster_snapshot.tar.zst',
    25,
    'raid_chunking',
    sampleNodes,
    10
  );
  assert.equal(res.success, true);
  assert.equal(res.isChunked, true);
  assert.equal(res.chunks.length, 3);
  assert.equal(res.chunks[0].chunkName, 'master_cluster_snapshot.tar.zst.part1');
  assert.equal(res.chunks[1].chunkName, 'master_cluster_snapshot.tar.zst.part2');
  assert.equal(res.chunks[2].chunkName, 'master_cluster_snapshot.tar.zst.part3');

  const sumAllocated = Number(
    res.chunks.reduce((acc, c) => acc + c.sizeGb, 0).toFixed(2)
  );
  assert.equal(sumAllocated, 25);
});

test('extractOtpAndLinks detects 4-8 digit OTP codes and verification URLs accurately', () => {
  const sampleEmail =
    'Your GitHub authentication verification code is 849204. Or click https://github.com/login/verify?token=abc123xyz to sign in.';
  const extracted = extractOtpAndLinks(sampleEmail);
  assert.equal(extracted.otp, '849204');
  assert.equal(extracted.verificationUrl, 'https://github.com/login/verify?token=abc123xyz');
});

test('normalizePhoneNumber and hashPhonePassword standardize +880 mobile numbers and isolate credentials', () => {
  assert.equal(normalizePhoneNumber('01711000001'), '+8801711000001');
  assert.equal(normalizePhoneNumber('+880 1711-000001'), '+8801711000001');
  const h1 = hashPhonePassword('01711000001', 'secret123');
  const h2 = hashPhonePassword('+8801711000001', 'secret123');
  const h3 = hashPhonePassword('+8801711000001', 'different');
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test('sliceBinaryFileIntoChunks physically slices a Blob using Blob.slice and computeBlobSha256 hashes it', async () => {
  const bytes = new Uint8Array(3000);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  const mockBlob = new Blob([bytes], { type: 'application/octet-stream' });

  const allocations = [
    {
      chunkIndex: 1,
      chunkName: 'video.mp4.part1',
      nodeId: 'node-1',
      nodeEmail: 'node_01@gmail.com',
      sizeGb: 1,
    },
    {
      chunkIndex: 2,
      chunkName: 'video.mp4.part2',
      nodeId: 'node-2',
      nodeEmail: 'node_02@gmail.com',
      sizeGb: 1,
    },
    {
      chunkIndex: 3,
      chunkName: 'video.mp4.part3',
      nodeId: 'node-3',
      nodeEmail: 'node_03@gmail.com',
      sizeGb: 1,
    },
  ];

  const sliced = sliceBinaryFileIntoChunks(mockBlob, allocations);
  assert.equal(sliced.length, 3);
  assert.equal(sliced[0].byteOffsetStart, 0);
  assert.equal(sliced[0].byteOffsetEnd, 1000);
  assert.equal(sliced[0].blob.size, 1000);
  assert.equal(sliced[1].byteOffsetStart, 1000);
  assert.equal(sliced[1].byteOffsetEnd, 2000);
  assert.equal(sliced[2].byteOffsetStart, 2000);
  assert.equal(sliced[2].byteOffsetEnd, 3000);

  const sha256 = await computeBlobSha256(mockBlob, 'video.mp4');
  assert.equal(sha256.length, 64);
});
