import { describe, it, expect } from 'vitest';
import {
  buildEventClient,
  buildEventConsent,
  buildEventGeo,
  buildSignedByChain,
  buildSignedBySnapshot,
  getLatestPreparedVersion,
  getLatestSignedVersion,
  getNextSequentialOrder,
  isRecipientTurn,
  normalizeIp,
  normalizeSignedBy,
} from '../lib/signing-utils';

describe('signing-utils', () => {
  it('computes next sequential order excluding completed recipients and viewers', () => {
    const recipients = [
      { role: 'viewer', order: 1, status: 'pending' },
      { role: 'signer', order: 2, status: 'signed' },
      { role: 'signer', order: 3, status: 'pending' },
      { role: 'approver', order: 4, status: 'approved' },
    ];
    expect(getNextSequentialOrder(recipients)).toBe(3);
  });

  it('returns null when no remaining sequential orders', () => {
    const recipients = [
      { role: 'signer', order: 1, status: 'signed' },
      { role: 'approver', order: 2, status: 'approved' },
    ];
    expect(getNextSequentialOrder(recipients)).toBeNull();
  });

  it('checks recipient turn in sequential signing', () => {
    const recipients = [
      { role: 'signer', order: 1, status: 'signed' },
      { role: 'signer', order: 2, status: 'pending' },
    ];
    expect(isRecipientTurn(recipients[1], recipients)).toBe(true);
  });

  it('picks the latest prepared version', () => {
    const versions = [
      { label: 'prepared', version: 1 },
      { label: 'prepared', version: 3 },
      { label: 'signed_final', version: 4 },
    ];
    expect(getLatestPreparedVersion(versions)?.version).toBe(3);
  });

  it('picks the latest signed version by label prefix', () => {
    const versions = [
      { label: 'prepared', version: 1 },
      { label: 'signed_by_order_1', version: 2 },
      { label: 'signed_final', version: 4 },
    ];
    expect(getLatestSignedVersion(versions)?.version).toBe(4);
  });

  it('normalizes signedBy values and preserves order', () => {
    expect(normalizeSignedBy('r1')).toEqual(['r1']);
    expect(normalizeSignedBy(['r1', '', 'r2'])).toEqual(['r1', 'r2']);
    expect(normalizeSignedBy(null)).toEqual([]);
  });

  it('builds signedBy chain without duplicates', () => {
    expect(buildSignedByChain(['r1'], 'r1')).toEqual(['r1']);
    expect(buildSignedByChain(['r1'], 'r2')).toEqual(['r1', 'r2']);
  });

  it('builds signedBy snapshot ordered by signedVersion then order then id', () => {
    const recipients = [
      { id: 'b', role: 'signer', status: 'signed', signedVersion: 2, order: 2 },
      { id: 'a', role: 'signer', status: 'signed', signedVersion: 1, order: 1 },
      { id: 'c', role: 'signer', status: 'signed', signedVersion: 2, order: 1 },
    ];
    expect(buildSignedBySnapshot(recipients, 2)).toEqual(['a', 'c', 'b']);
  });

  it('normalizes IPs and marks loopback values unavailable', () => {
    expect(normalizeIp(undefined)).toEqual({ ip: undefined, ipUnavailableReason: 'unavailable' });
    expect(normalizeIp('::1')).toEqual({ ip: undefined, ipUnavailableReason: 'loopback' });
    expect(normalizeIp('198.51.100.1, 10.0.0.1')).toEqual({ ip: '198.51.100.1' });
  });

  it('builds client/geo/consent payloads only when data exists', () => {
    expect(buildEventClient({})).toBeUndefined();

    const client = buildEventClient({
      ip: '203.0.113.10',
      userAgent: 'ua',
      recipient: { device: { type: 'desktop' } },
    });
    expect(client).toMatchObject({ ip: '203.0.113.10', userAgent: 'ua', deviceType: 'desktop' });

    const geo = buildEventGeo({
      location: { latitude: 1, longitude: 2, city: 'NYC', country: 'US' },
    });
    expect(geo).toMatchObject({ latitude: 1, longitude: 2, city: 'NYC', country: 'US' });

    const consent = buildEventConsent({ consent: { locationGranted: true } });
    expect(consent).toMatchObject({ locationGranted: true, method: 'other' });
  });
});
