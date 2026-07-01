import type { JjVersion } from './version';

export class JjBinaryNotFoundError extends Error {
  constructor() {
    super('jj binary not found on PATH');
    this.name = 'JjBinaryNotFoundError';
  }
}

export class JjNotARepositoryError extends Error {
  constructor(public readonly path: string) {
    super(`"${path}" is not a jj repository`);
    this.name = 'JjNotARepositoryError';
  }
}

export class JjVersionTooOldError extends Error {
  constructor(
    public readonly found: JjVersion,
    public readonly minimum: JjVersion,
  ) {
    super(`jj ${found.raw} is older than the minimum supported version ${minimum.raw}`);
    this.name = 'JjVersionTooOldError';
  }
}
