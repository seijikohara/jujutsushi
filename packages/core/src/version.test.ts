import { parseJjVersion, isVersionAtLeast, MINIMUM_SUPPORTED_JJ_VERSION } from './version';

describe('parseJjVersion', () => {
  it('parses real `jj --version` output', () => {
    expect(parseJjVersion('jj 0.42.0\n')).toEqual({
      major: 0,
      minor: 42,
      patch: 0,
      raw: 'jj 0.42.0',
    });
  });

  it('throws when the output has no version number', () => {
    expect(() => parseJjVersion('not a version string')).toThrow(
      'Could not parse jj version from: "not a version string"',
    );
  });
});

describe('isVersionAtLeast', () => {
  const minimum = { major: 0, minor: 42, patch: 0, raw: '0.42.0' };

  it('returns true when the major version is newer', () => {
    expect(isVersionAtLeast({ major: 1, minor: 0, patch: 0, raw: '1.0.0' }, minimum)).toBe(true);
  });

  it('returns true when exactly equal to the minimum', () => {
    expect(isVersionAtLeast({ major: 0, minor: 42, patch: 0, raw: '0.42.0' }, minimum)).toBe(true);
  });

  it('returns false when the minor version is older', () => {
    expect(isVersionAtLeast({ major: 0, minor: 41, patch: 9, raw: '0.41.9' }, minimum)).toBe(false);
  });

  it('returns false when only the patch version is older', () => {
    expect(
      isVersionAtLeast(
        { major: 0, minor: 42, patch: 0, raw: '0.42.0' },
        { major: 0, minor: 42, patch: 1, raw: '0.42.1' },
      ),
    ).toBe(false);
  });
});

describe('MINIMUM_SUPPORTED_JJ_VERSION', () => {
  it('is 0.42.0', () => {
    expect(MINIMUM_SUPPORTED_JJ_VERSION).toEqual({ major: 0, minor: 42, patch: 0, raw: '0.42.0' });
  });
});
