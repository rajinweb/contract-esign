import { createHash } from 'crypto';
import { Transform } from 'stream';

/**
 * Creates a transform stream that computes a SHA-256 hash while passing data through.
 */
export function createSha256Transform(): { transform: Transform; digestPromise: Promise<string> } {
  const hash = createHash('sha256');
  const transform = new Transform({
    transform(chunk, encoding, callback) {
      hash.update(chunk);
      this.push(chunk);
      callback();
    },
  });

  const digestPromise = new Promise<string>((resolve, reject) => {
    transform.on('finish', () => resolve(hash.digest('hex')));
    transform.on('error', reject);
  });

  return { transform, digestPromise };
}

/**
 * Computes the SHA-256 hash of a buffer.
 */
export function sha256Buffer(buffer: Buffer): Promise<string> {
  return Promise.resolve(createHash('sha256').update(buffer).digest('hex'));
}