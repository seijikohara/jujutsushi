import { JjBinaryNotFoundError, JjNotARepositoryError, JjVersionTooOldError } from './errors';

describe('JjBinaryNotFoundError', () => {
  it('has a clear message', () => {
    expect(new JjBinaryNotFoundError().message).toBe('jj binary not found on PATH');
  });
});

describe('JjNotARepositoryError', () => {
  it('includes the offending path', () => {
    expect(new JjNotARepositoryError('/tmp/not-a-repo').message).toBe(
      '"/tmp/not-a-repo" is not a jj repository',
    );
  });
});

describe('JjVersionTooOldError', () => {
  it('includes both the found and minimum versions', () => {
    const found = { major: 0, minor: 40, patch: 0, raw: '0.40.0' };
    const minimum = { major: 0, minor: 42, patch: 0, raw: '0.42.0' };
    const error = new JjVersionTooOldError(found, minimum);
    expect(error.message).toBe('jj 0.40.0 is older than the minimum supported version 0.42.0');
    expect(error.found).toBe(found);
    expect(error.minimum).toBe(minimum);
  });
});
