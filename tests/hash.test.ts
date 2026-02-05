import { describe, it, expect } from 'vitest';
import { createSha256Transform, sha256Buffer } from '../lib/hash';

describe('hash utilities', () => {
  it('sha256Buffer hashes buffers correctly', async () => {
    const digest = await sha256Buffer(Buffer.from('hello'));
    expect(digest).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('createSha256Transform hashes streaming data', async () => {
    const { transform, digestPromise } = createSha256Transform();
    transform.end('hello');
    const digest = await digestPromise;
    expect(digest).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});
